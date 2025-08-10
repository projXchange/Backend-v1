import { 
  createProjectsDump, 
  updateProjectsDump, 
  findById, 
  findAll, 
  deleteProjectsDump 
} from "../repository/projects-dump.repository";
import { findById as findProjectById } from "../repository/projects.repository";
import { uploadImage, deleteImage } from "../utils/cloudinary.util";

export const createProjectDumpHandler = async (c: any) => {
  try {
    const { id } = c.req.param();
    const userId = c.get("userId");
    const user = c.get("user");

    if (!id) {
      return c.json({ error: "Project ID is required" }, 400);
    }

    // Verify project exists and user has permission
    let project;
    try {
      const result = await findProjectById(id);
      project = result[0];
    } catch (error) {
      return c.json({ error: "Project not found" }, 404);
    }

    // Check if user owns the project or is admin/manager
    if (project.author_id !== userId && !["admin", "manager"].includes(user.user_type)) {
      return c.json({ error: "Unauthorized to create dump for this project" }, 403);
    }

    const { 
      thumbnail, images, demo_video, features, tags, 
      files, requirements, stats, rating 
    } = await c.req.json();

    // Handle image uploads
    let thumbnailUrl = thumbnail;
    if (thumbnail && thumbnail.startsWith('data:')) {
      thumbnailUrl = await uploadImage(thumbnail, `projects/${id}/thumbnail`);
    }

    let uploadedImages = images || [];
    if (images && Array.isArray(images)) {
      uploadedImages = await Promise.all(
        images.map(async (img: string, index: number) => {
          if (img.startsWith('data:')) {
            return await uploadImage(img, `projects/${id}/images/${index}`);
          }
          return img;
        })
      );
    }

    let videoUrl = demo_video;
    if (demo_video && demo_video.startsWith('data:')) {
      // For video upload, you might want to use a different service or Cloudinary video upload
      videoUrl = await uploadImage(demo_video, `projects/${id}/videos`);
    }

    const dumpData = {
      id,
      thumbnail: thumbnailUrl,
      images: uploadedImages,
      demo_video: videoUrl,
      features: features || [],
      tags: tags || [],
      files,
      requirements,
      stats,
      rating
    };

    const [newDump] = await createProjectsDump(dumpData);
    
    return c.json({ 
      message: "Project dump created successfully", 
      dump: newDump 
    });
  } catch (error: any) {
    console.error("Create project dump error:", error);
    return c.json({ 
      error: error.message || "Failed to create project dump" 
    }, 500);
  }
};

export const updateProjectDumpHandler = async (c: any) => {
  try {
    const { id } = c.req.param();
    const userId = c.get("userId");
    const user = c.get("user");

    if (!id) {
      return c.json({ error: "Project ID is required" }, 400);
    }

    // Verify project exists and user has permission
    let project;
    try {
      const result = await findProjectById(id);
      project = result[0];
    } catch (error) {
      return c.json({ error: "Project not found" }, 404);
    }

    // Check if user owns the project or is admin/manager
    if (project.author_id !== userId && !["admin", "manager"].includes(user.user_type)) {
      return c.json({ error: "Unauthorized to update dump for this project" }, 403);
    }

    // Get current dump for cleanup
    let currentDump = null;
    try {
      const result = await findById(id);
      currentDump = result[0];
    } catch (error) {
      return c.json({ error: "Project dump not found" }, 404);
    }

    const updateData = await c.req.json();

    // Handle thumbnail update
    if (updateData.thumbnail && updateData.thumbnail.startsWith('data:')) {
      // Delete old thumbnail
      if (currentDump.thumbnail && currentDump.thumbnail.includes('cloudinary')) {
        await deleteImage(currentDump.thumbnail);
      }
      updateData.thumbnail = await uploadImage(updateData.thumbnail, `projects/${id}/thumbnail`);
    }

    // Handle images update
    if (updateData.images && Array.isArray(updateData.images)) {
      // Delete old images
      if (currentDump.images && Array.isArray(currentDump.images)) {
        await Promise.all(
          currentDump.images
            .filter(img => img.includes('cloudinary'))
            .map(img => deleteImage(img))
        );
      }

      updateData.images = await Promise.all(
        updateData.images.map(async (img: string, index: number) => {
          if (img.startsWith('data:')) {
            return await uploadImage(img, `projects/${id}/images/${index}`);
          }
          return img;
        })
      );
    }

    // Handle video update
    if (updateData.demo_video && updateData.demo_video.startsWith('data:')) {
      // Delete old video
      if (currentDump.demo_video && currentDump.demo_video.includes('cloudinary')) {
        await deleteImage(currentDump.demo_video);
      }
      updateData.demo_video = await uploadImage(updateData.demo_video, `projects/${id}/videos`);
    }

    const [updatedDump] = await updateProjectsDump(id, updateData);
    
    return c.json({ 
      message: "Project dump updated successfully", 
      dump: updatedDump 
    });
  } catch (error: any) {
    console.error("Update project dump error:", error);
    return c.json({ 
      error: error.message || "Failed to update project dump" 
    }, 500);
  }
};

export const getProjectDumpById = async (c: any) => {
  try {
    const { id } = c.req.param();

    if (!id) {
      return c.json({ error: "Project ID is required" }, 400);
    }

    const result = await findById(id);
    const dump = result[0];
    
    return c.json({ dump });
  } catch (error: any) {
    console.error("Get project dump by ID error:", error);
    return c.json({ 
      error: error.message || "Failed to fetch project dump" 
    }, 500);
  }
};

export const getAllProjectDumps = async (c: any) => {
  try {
    const dumps = await findAll();
    
    return c.json({ 
      dumps,
      total: dumps.length 
    });
  } catch (error: any) {
    console.error("Get all project dumps error:", error);
    return c.json({ 
      error: error.message || "Failed to fetch project dumps" 
    }, 500);
  }
};

export const deleteProjectDumpHandler = async (c: any) => {
  try {
    const { id } = c.req.param();
    const userId = c.get("userId");
    const user = c.get("user");

    if (!id) {
      return c.json({ error: "Project ID is required" }, 400);
    }

    // Verify project exists and user has permission
    let project;
    try {
      const result = await findProjectById(id);
      project = result[0];
    } catch (error) {
      return c.json({ error: "Project not found" }, 404);
    }

    // Check if user owns the project or is admin/manager
    if (project.author_id !== userId && !["admin", "manager"].includes(user.user_type)) {
      return c.json({ error: "Unauthorized to delete dump for this project" }, 403);
    }

    // Get current dump for cleanup
    try {
      const result = await findById(id);
      const currentDump = result[0];
      
      // Delete associated media files
      if (currentDump.thumbnail && currentDump.thumbnail.includes('cloudinary')) {
        await deleteImage(currentDump.thumbnail);
      }
      
      if (currentDump.images && Array.isArray(currentDump.images)) {
        await Promise.all(
          currentDump.images
            .filter(img => img.includes('cloudinary'))
            .map(img => deleteImage(img))
        );
      }
      
      if (currentDump.demo_video && currentDump.demo_video.includes('cloudinary')) {
        await deleteImage(currentDump.demo_video);
      }
    } catch (error) {
      // Dump doesn't exist, continue with deletion attempt
    }

    await deleteProjectsDump(id);
    
    return c.json({ 
      message: "Project dump deleted successfully" 
    });
  } catch (error: any) {
    console.error("Delete project dump error:", error);
    return c.json({ 
      error: error.message || "Failed to delete project dump" 
    }, 500);
  }
};
