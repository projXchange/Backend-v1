import { 
  createProject, 
  updateProject, 
  deleteProject, 
  findById, 
  findByAuthor, 
  findByCategory, 
  findFeatured, 
  findWithFilters,
  addBuyer,
  checkUserPurchased
} from "../repository/projects.repository";
import { PROJECT_STATUS } from "../constants/projects";
import { uploadImage, deleteImage } from "../utils/cloudinary.util";

export const createProjectHandler = async (c: any) => {
  try {
    const userId = c.get("userId");
    const user = c.get("user");
    
    // Only users, admins, and managers can create projects
    if (!["user", "admin", "manager"].includes(user.user_type)) {
      return c.json({ error: "Only users, admins, and managers can create projects" }, 403);
    }

    const { 
      title, description, key_features, category, 
      difficulty_level, tech_stack, github_url, demo_url, 
      pricing, delivery_time,
      thumbnail, images, 
      files, requirements, rating 
    } = await c.req.json();

    if (!title || !description) {
      return c.json({ error: "Title and description are required" }, 400);
    }

    // Validate pricing if provided
    if (pricing && (!pricing.sale_price || !pricing.original_price)) {
      return c.json({ error: "Both sale_price and original_price are required in pricing" }, 400);
    }

    // Handle image uploads
    let thumbnailUrl = thumbnail;
    if (thumbnail && thumbnail.startsWith('data:')) {
      thumbnailUrl = await uploadImage(thumbnail, `projects/temp/thumbnail`);
    }

    let uploadedImages = images || [];
    if (images && Array.isArray(images)) {
      uploadedImages = await Promise.all(
        images.map(async (img: string, index: number) => {
          if (img.startsWith('data:')) {
            return await uploadImage(img, `projects/temp/images/${index}`);
          }
          return img;
        })
      );
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
      pricing,
      delivery_time: delivery_time || 0,
      status: PROJECT_STATUS.DRAFT,
      thumbnail: thumbnailUrl,
      images: uploadedImages,
      files,
      requirements,
      rating
    };

    const [newProject] = await createProject(projectData);
    
    return c.json({ 
      message: "Project created successfully", 
      project: newProject 
    });
  } catch (error: any) {
    c.logger.error("Failed to create project", error, {
      userId: c.get("userId"),
      userType: c.get("user")?.user_type,
      action: 'create_project'
    });
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
    delete updateData.buyers;

    // Handle image uploads for dump fields
    if (updateData.thumbnail && updateData.thumbnail.startsWith('data:')) {
      // Delete old thumbnail
      if (currentProject.thumbnail && currentProject.thumbnail.includes('cloudinary')) {
        await deleteImage(currentProject.thumbnail);
      }
      updateData.thumbnail = await uploadImage(updateData.thumbnail, `projects/${id}/thumbnail`);
    }

    if (updateData.images && Array.isArray(updateData.images)) {
      // Delete old images
      if (currentProject.images && Array.isArray(currentProject.images)) {
        await Promise.all(
          currentProject.images
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
    const { id } = c.req.param();
    c.logger.error("Failed to update project", error, {
      userId: c.get("userId"),
      projectId: id,
      action: 'update_project'
    });
    return c.json({ 
      error: error.message || "Failed to update project" 
    }, 500);
  }
};

export const getProjectById = async (c: any) => {
  try {
    const { id } = c.req.param();
    const userId = c.get("userId");
    const user = c.get("user");

    if (!id) {
      return c.json({ error: "Project ID is required" }, 400);
    }

    const result = await findById(id);
    const project = result[0];

    // Check if user can access this project
    const isAdmin = user && ["admin", "manager"].includes(user.user_type);
    const isOwner = userId && project.author_id === userId;
    const isApproved = project.status === PROJECT_STATUS.APPROVED;
    
    // Allow access if: admin, owner, or project is approved
    if (!isAdmin && !isOwner && !isApproved) {
      return c.json({ error: "Project not found or not available" }, 404);
    }

    // Log admin access to non-approved projects for auditing
    if (isAdmin && !isApproved) {
      c.logger.info("Admin accessed non-approved project", {
        adminUserId: userId,
        adminUserType: user.user_type,
        projectId: id,
        projectStatus: project.status,
        projectAuthor: project.author_id,
        action: 'admin_access_restricted_project'
      });
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
    const { id } = c.req.param();
    c.logger.error("Failed to fetch project by ID", error, {
      userId: c.get("userId"),
      projectId: id,
      action: 'get_project_by_id'
    });
    return c.json({ 
      error: error.message || "Failed to fetch project" 
    }, 500);
  }
};

export const getProjectsWithFilters = async (c: any) => {
  try {
    const query = c.req.query();
    const user = c.get("user"); // Get user info to check if admin/manager
    const userId = c.get("userId");
    
    // Determine default status based on user role and filters
    let defaultStatus;
    if (user && ["admin", "manager"].includes(user.user_type)) {
      // Admin/Manager: show all statuses if not specified
      defaultStatus = undefined;
    } else if (query.author_id && query.author_id === userId) {
      // User viewing their own projects: show all their project statuses
      defaultStatus = undefined;
    } else {
      // Regular users viewing public projects: only show approved projects
      defaultStatus = [PROJECT_STATUS.APPROVED];
    }
    
    const filters = {
      category: query.category ? query.category.split(',') : undefined,
      author_id: query.author_id,
      difficulty_level: query.difficulty_level ? query.difficulty_level.split(',') : undefined,
      tech_stack: query.tech_stack ? query.tech_stack.split(',') : undefined,
      status: query.status ? query.status.split(',') : defaultStatus,
      is_featured: query.is_featured === "true" ? true : query.is_featured === "false" ? false : undefined,
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
    
    // Log special access for auditing
    if (user && ["admin", "manager"].includes(user.user_type)) {
      c.logger.info("Admin accessed projects list", {
        adminUserId: userId,
        adminUserType: user.user_type,
        filters: filters,
        resultCount: result.data.length,
        action: 'admin_get_projects_list'
      });
    } else if (query.author_id && query.author_id === userId) {
      c.logger.info("User accessed their own projects list", {
        userId: userId,
        filters: filters,
        resultCount: result.data.length,
        action: 'user_get_own_projects_list'
      });
    }
    
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
    c.logger.error("Failed to fetch projects with filters", error, {
      userId: c.get("userId"),
      action: 'get_projects_with_filters'
    });
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
    c.logger.error("Failed to fetch user's projects", error, {
      userId: c.get("userId"),
      action: 'get_my_projects'
    });
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
    c.logger.error("Failed to fetch featured projects", error, {
      action: 'get_featured_projects'
    });
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
    const { id } = c.req.param();
    c.logger.error("Failed to delete project", error, {
      userId: c.get("userId"),
      projectId: id,
      action: 'delete_project'
    });
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
    const { id } = c.req.param();
    c.logger.error("Failed to update project status", error, {
      adminUserId: c.get("userId"),
      projectId: id,
      action: 'update_project_status',
      adminOnly: true
    });
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

    if (project.status !== PROJECT_STATUS.APPROVED) {
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
    const { id } = c.req.param();
    c.logger.error("Failed to purchase project", error, {
      userId: c.get("userId"),
      projectId: id,
      action: 'purchase_project'
    });
    return c.json({ 
      error: error.message || "Failed to purchase project" 
    }, 500);
  }
};
function decrementProjectCount(category_id: any) {
  throw new Error("Function not implemented.");
}


