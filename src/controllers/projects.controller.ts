import { 
  createProject, 
  updateProject, 
  deleteProject, 
  findById, 
  findByAuthor, 
  findByCategory, 
  findFeatured, 
  findWithFilters,
  incrementViewCount,
  addBuyer,
  checkUserPurchased
} from "../repository/projects.repository";
import { uploadImage, deleteImage } from "../utils/cloudinary.util";

export const createProjectHandler = async (c: any) => {
  try {
    const userId = c.get("userId");
    const user = c.get("user");
    
    // Only sellers can create projects
    if (user.user_type !== "seller" && !["admin", "manager"].includes(user.user_type)) {
      return c.json({ error: "Only sellers can create projects" }, 403);
    }

    const { 
      title, description, key_features, category, 
      difficulty_level, tech_stack, github_url, demo_url, 
      documentation, pricing, delivery_time 
    } = await c.req.json();

    if (!title || !description) {
      return c.json({ error: "Title and description are required" }, 400);
    }

    // Validate pricing if provided
    if (pricing && (!pricing.sale_price || !pricing.original_price)) {
      return c.json({ error: "Both sale_price and original_price are required in pricing" }, 400);
    }

    const projectData = {
      title: title.trim(),
      description: description.trim(),
      key_features,
      category: category || "web_development",
      author_id: userId,
      difficulty_level: difficulty_level || "beginner",
      tech_stack: tech_stack || [],
      github_url,
      demo_url,
      documentation,
      pricing,
      delivery_time: delivery_time || 0,
      status: "draft" as const
    };

    const [newProject] = await createProject(projectData);
    
    return c.json({ 
      message: "Project created successfully", 
      project: newProject 
    });
  } catch (error: any) {
    console.error("Create project error:", error);
    return c.json({ 
      error: error.message || "Failed to create project" 
    }, 500);
  }
};

export const updateProjectHandler = async (c: any) => {
  try {
    const { id } = c.req.param();
    const userId = c.get("userId");
    const user = c.get("user");

    if (!id) {
      return c.json({ error: "Project ID is required" }, 400);
    }

    // Get current project to check ownership
    let currentProject;
    try {
      const result = await findById(id);
      currentProject = result[0];
    } catch (error) {
      return c.json({ error: "Project not found" }, 404);
    }

    // Check if user owns the project or is admin/manager
    if (currentProject.author_id !== userId && !["admin", "manager"].includes(user.user_type)) {
      return c.json({ error: "Unauthorized to update this project" }, 403);
    }

    const updateData = await c.req.json();
    
    // Remove fields that shouldn't be updated directly
    delete updateData.author_id;
    delete updateData.view_count;
    delete updateData.purchase_count;
    delete updateData.download_count;
    delete updateData.buyers;

    // Validate pricing if being updated
    if (updateData.pricing && (!updateData.pricing.sale_price || !updateData.pricing.original_price)) {
      return c.json({ error: "Both sale_price and original_price are required in pricing" }, 400);
    }

    if (Object.keys(updateData).length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }

    const [updatedProject] = await updateProject(id, updateData);
    
    return c.json({ 
      message: "Project updated successfully", 
      project: updatedProject 
    });
  } catch (error: any) {
    console.error("Update project error:", error);
    return c.json({ 
      error: error.message || "Failed to update project" 
    }, 500);
  }
};

export const getProjectById = async (c: any) => {
  try {
    const { id } = c.req.param();
    const userId = c.get("userId");

    if (!id) {
      return c.json({ error: "Project ID is required" }, 400);
    }

    const result = await findById(id);
    const project = result[0];

    // Increment view count if user is not the author
    if (project.author_id !== userId) {
      await incrementViewCount(id);
    }

    // Check if current user has purchased this project
    let hasPurchased = false;
    let inWishlist = false;
    let inCart = false;
    
    if (userId) {
      hasPurchased = await checkUserPurchased(id, userId);
      // You can add wishlist and cart checks here if needed
    }

    // Calculate discount percentage
    let discountPercentage = 0;
    if (project.pricing?.original_price && project.pricing?.sale_price) {
      discountPercentage = Math.round(
        ((project.pricing.original_price - project.pricing.sale_price) / project.pricing.original_price) * 100
      );
    }

    return c.json({ 
      project: {
        ...project,
        discount_percentage: discountPercentage
      },
      user_status: {
        has_purchased: hasPurchased,
        in_wishlist: inWishlist,
        in_cart: inCart
      }
    });
  } catch (error: any) {
    console.error("Get project by ID error:", error);
    return c.json({ 
      error: error.message || "Failed to fetch project" 
    }, 500);
  }
};

export const getProjectsWithFilters = async (c: any) => {
  try {
    const query = c.req.query();
    
    const filters = {
      category: query.category ? query.category.split(',') : undefined,
      author_id: query.author_id,
      difficulty_level: query.difficulty_level ? query.difficulty_level.split(',') : undefined,
      tech_stack: query.tech_stack ? query.tech_stack.split(',') : undefined,
      status: query.status ? query.status.split(',') : ["published"],
      is_featured: query.is_featured === "true" ? true : undefined,
      min_price: query.min_price ? parseFloat(query.min_price) : undefined,
      max_price: query.max_price ? parseFloat(query.max_price) : undefined,
      currency: query.currency as "INR" | "USD" | undefined,
      search: query.search,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 10,
      sort_by: query.sort_by || "created_at",
      sort_order: query.sort_order || "desc"
    };

    const result = await findWithFilters(filters);
    
    // Add discount percentage to each project
    const projectsWithDiscounts = result.data.map(project => {
      let discountPercentage = 0;
      if (project.pricing?.original_price && project.pricing?.sale_price) {
        discountPercentage = Math.round(
          ((project.pricing.original_price - project.pricing.sale_price) / project.pricing.original_price) * 100
        );
      }
      return {
        ...project,
        discount_percentage: discountPercentage
      };
    });

    return c.json({
      ...result,
      data: projectsWithDiscounts
    });
  } catch (error: any) {
    console.error("Get projects with filters error:", error);
    return c.json({ 
      error: error.message || "Failed to fetch projects" 
    }, 500);
  }
};

export const getMyProjects = async (c: any) => {
  try {
    const userId = c.get("userId");
    
    const projects = await findByAuthor(userId, true); // Include unpublished
    
    return c.json({ 
      projects,
      total: projects.length 
    });
  } catch (error: any) {
    console.error("Get my projects error:", error);
    return c.json({ 
      error: error.message || "Failed to fetch projects" 
    }, 500);
  }
};

export const getFeaturedProjects = async (c: any) => {
  try {
    const { limit } = c.req.query();
    const limitNum = limit ? parseInt(limit) : 10;
    
    const projects = await findFeatured(limitNum);
    
    return c.json({ 
      projects,
      total: projects.length 
    });
  } catch (error: any) {
    console.error("Get featured projects error:", error);
    return c.json({ 
      error: error.message || "Failed to fetch featured projects" 
    }, 500);
  }
};

export const deleteProjectHandler = async (c: any) => {
  try {
    const { id } = c.req.param();
    const userId = c.get("userId");
    const user = c.get("user");

    if (!id) {
      return c.json({ error: "Project ID is required" }, 400);
    }

    // Get current project to check ownership
    let currentProject;
    try {
      const result = await findById(id);
      currentProject = result[0];
    } catch (error) {
      return c.json({ error: "Project not found" }, 404);
    }

    // Check if user owns the project or is admin/manager
    if (currentProject.author_id !== userId && !["admin", "manager"].includes(user.user_type)) {
      return c.json({ error: "Unauthorized to delete this project" }, 403);
    }

    await deleteProject(id);
    
    // Decrement category project count
    if (currentProject.category) {
      await decrementProjectCount(currentProject.category);
    }
    
    return c.json({ 
      message: "Project deleted successfully" 
    });
  } catch (error: any) {
    console.error("Delete project error:", error);
    return c.json({ 
      error: error.message || "Failed to delete project" 
    }, 500);
  }
};

// Admin only endpoints
export const updateProjectStatus = async (c: any) => {
  try {
    const { id } = c.req.param();
    const { status, is_featured } = await c.req.json();

    if (!id) {
      return c.json({ error: "Project ID is required" }, 400);
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (is_featured !== undefined) updateData.is_featured = is_featured;

    if (Object.keys(updateData).length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }

    const [updatedProject] = await updateProject(id, updateData);
    
    return c.json({ 
      message: "Project status updated successfully", 
      project: updatedProject 
    });
  } catch (error: any) {
    console.error("Update project status error:", error);
    return c.json({ 
      error: error.message || "Failed to update project status" 
    }, 500);
  }
};

export const purchaseProject = async (c: any) => {
  try {
    const { id } = c.req.param();
    const userId = c.get("userId");

    if (!id) {
      return c.json({ error: "Project ID is required" }, 400);
    }

    // Check if project exists and is published
    const result = await findById(id);
    const project = result[0];

    if (project.status !== "published") {
      return c.json({ error: "Project is not available for purchase" }, 400);
    }

    // Check if user is the author
    if (project.author_id === userId) {
      return c.json({ error: "Cannot purchase your own project" }, 400);
    }

    // Check if already purchased
    const hasPurchased = await checkUserPurchased(id, userId);
    if (hasPurchased) {
      return c.json({ error: "Project already purchased" }, 400);
    }

    // Add buyer to project
    await addBuyer(id, userId);
    
    return c.json({ 
      message: "Project purchased successfully" 
    });
  } catch (error: any) {
    console.error("Purchase project error:", error);
    return c.json({ 
      error: error.message || "Failed to purchase project" 
    }, 500);
  }
};
function decrementProjectCount(category_id: any) {
  throw new Error("Function not implemented.");
}

// Dump management functions
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
      const result = await findById(id);
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

    const [updatedProject] = await updateProject(id, dumpData);
    
    return c.json({ 
      message: "Project dump created successfully", 
      project: updatedProject 
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
      const result = await findById(id);
      project = result[0];
    } catch (error) {
      return c.json({ error: "Project not found" }, 404);
    }

    // Check if user owns the project or is admin/manager
    if (project.author_id !== userId && !["admin", "manager"].includes(user.user_type)) {
      return c.json({ error: "Unauthorized to update dump for this project" }, 403);
    }

    const updateData = await c.req.json();

    // Handle thumbnail update
    if (updateData.thumbnail && updateData.thumbnail.startsWith('data:')) {
      // Delete old thumbnail
      if (project.thumbnail && project.thumbnail.includes('cloudinary')) {
        await deleteImage(project.thumbnail);
      }
      updateData.thumbnail = await uploadImage(updateData.thumbnail, `projects/${id}/thumbnail`);
    }

    // Handle images update
    if (updateData.images && Array.isArray(updateData.images)) {
      // Delete old images
      if (project.images && Array.isArray(project.images)) {
        await Promise.all(
          project.images
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
      if (project.demo_video && project.demo_video.includes('cloudinary')) {
        await deleteImage(project.demo_video);
      }
      updateData.demo_video = await uploadImage(updateData.demo_video, `projects/${id}/videos`);
    }

    const [updatedProject] = await updateProject(id, updateData);
    
    return c.json({ 
      message: "Project dump updated successfully", 
      project: updatedProject 
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
    const project = result[0];
    
    return c.json({ project });
  } catch (error: any) {
    console.error("Get project dump by ID error:", error);
    return c.json({ 
      error: error.message || "Failed to fetch project dump" 
    }, 500);
  }
};

export const getAllProjectDumps = async (c: any) => {
  try {
    const { include_deleted } = c.req.query();
    const includeDeleted = include_deleted === "true";
    
    const filters = {
      page: 1,
      limit: 1000, // Get all projects
      status: includeDeleted ? undefined : ["published"]
    };
    
    const result = await findWithFilters(filters);
    
    return c.json({ 
      projects: result.data,
      total: result.data.length 
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
      const result = await findById(id);
      project = result[0];
    } catch (error) {
      return c.json({ error: "Project not found" }, 404);
    }

    // Check if user owns the project or is admin/manager
    if (project.author_id !== userId && !["admin", "manager"].includes(user.user_type)) {
      return c.json({ error: "Unauthorized to delete dump for this project" }, 403);
    }

    // Get current project for cleanup
    try {
      // Delete associated media files
      if (project.thumbnail && project.thumbnail.includes('cloudinary')) {
        await deleteImage(project.thumbnail);
      }
      
      if (project.images && Array.isArray(project.images)) {
        await Promise.all(
          project.images
            .filter(img => img.includes('cloudinary'))
            .map(img => deleteImage(img))
        );
      }
      
      if (project.demo_video && project.demo_video.includes('cloudinary')) {
        await deleteImage(project.demo_video);
      }
    } catch (error) {
      // Project doesn't exist, continue with deletion attempt
    }

    // Clear dump fields
    const clearData = {
      thumbnail: null,
      images: [],
      demo_video: null,
      features: [],
      tags: [],
      files: null,
      requirements: null,
      stats: null,
      rating: null
    };

    await updateProject(id, clearData);
    
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

