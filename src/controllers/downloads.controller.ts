// controllers/downloads.controller.ts
import { 
  findByUser, 
  findByProject, 
  createDownload, 
  getDownloadStats,
  getUserDownloadHistory
} from "../repository/downloads.repository";
import { findById as findProjectById, incrementDownloadCount } from "../repository/projects.repository";
import { checkUserPurchased } from "../repository/projects.repository";

export const getUserDownloads = async (c: any) => {
  try {
    const userId = c.get("userId");
    
    const downloads = await findByUser(userId);
    
    return c.json({ 
      downloads,
      total: downloads.length 
    });
  } catch (error: any) {
    console.error("Get user downloads error:", error);
    return c.json({ 
      error: error.message || "Failed to fetch downloads" 
    }, 500);
  }
};

export const downloadProject = async (c: any) => {
  try {
    const userId = c.get("userId");
    const { project_id } = c.req.param();
    const { download_type = "full" } = await c.req.json();

    if (!project_id) {
      return c.json({ error: "Project ID is required" }, 400);
    }

    // Verify project exists
    let project;
    try {
      const result = await findProjectById(project_id);
      project = result[0];
    } catch (error) {
      return c.json({ error: "Project not found" }, 404);
    }

    // Check if project is published
    if (project.status !== "published") {
      return c.json({ error: "Project is not available for download" }, 400);
    }

    // For full downloads, check if user has purchased the project
    if (download_type === "full") {
      const hasPurchased = await checkUserPurchased(project_id, userId);
      if (!hasPurchased && project.author_id !== userId) {
        return c.json({ error: "You must purchase this project to download it" }, 403);
      }
    }

    // Get client info for analytics
    const ip_address = c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "unknown";
    const user_agent = c.req.header("user-agent") || "unknown";

    // Create download record
    const [downloadRecord] = await createDownload({
      user_id: userId,
      project_id,
      download_type,
      ip_address,
      user_agent
    });

    // Increment download count
    await incrementDownloadCount(project_id);
    
    return c.json({ 
      message: "Download recorded successfully",
      download_id: downloadRecord.id,
      download_type
    });
  } catch (error: any) {
    console.error("Download project error:", error);
    return c.json({ 
      error: error.message || "Failed to process download" 
    }, 500);
  }
};

export const getProjectDownloadStats = async (c: any) => {
  try {
    const { project_id } = c.req.param();
    const userId = c.get("userId");
    const user = c.get("user");

    if (!project_id) {
      return c.json({ error: "Project ID is required" }, 400);
    }

    // Verify project exists and user has permission to view stats
    let project;
    try {
      const result = await findProjectById(project_id);
      project = result[0];
    } catch (error) {
      return c.json({ error: "Project not found" }, 404);
    }

    // Only project author or admin/manager can view download stats
    if (project.author_id !== userId && !["admin", "manager"].includes(user.user_type)) {
      return c.json({ error: "Unauthorized to view download stats" }, 403);
    }

    const stats = await getDownloadStats(project_id);
    
    return c.json({ 
      project_id,
      stats
    });
  } catch (error: any) {
    console.error("Get project download stats error:", error);
    return c.json({ 
      error: error.message || "Failed to fetch download stats" 
    }, 500);
  }
};

export const getUserDownloadHistoryHandler = async (c: any) => {
  try {
    const userId = c.get("userId");
    const { project_id } = c.req.param();

    if (!project_id) {
      return c.json({ error: "Project ID is required" }, 400);
    }

    const history = await getUserDownloadHistory(userId, project_id);
    
    return c.json({ 
      project_id,
      download_history: history,
      total: history.length
    });
  } catch (error: any) {
    console.error("Get user download history error:", error);
    return c.json({ 
      error: error.message || "Failed to fetch download history" 
    }, 500);
  }
};
