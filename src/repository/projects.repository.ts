// repository/projects.repository.ts
import { eq, and, ne, desc, asc, like, gte, lte, inArray, sql, arrayContains } from "drizzle-orm";
import { projects } from "../models/schema";
import db from "./db";

class ProjectRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectRepositoryError";
  }
}

class ProjectNotFoundError extends ProjectRepositoryError {
  constructor(message = "Project not found") {
    super(message);
    this.name = "ProjectNotFoundError";
  }
}

export interface CreateProjectData {
  title: string;
  description: string;
  key_features?: string;
  category?: "web_development" | "mobile_development" | "desktop_application" | "ai_machine_learning" | "blockchain" | "game_development" | "data_science" | "devops" | "api_backend" | "automation_scripts" | "ui_ux_design" | "other";
  author_id: string;
  difficulty_level?: "beginner" | "intermediate" | "advanced" | "expert";
  tech_stack?: string[];
  github_url?: string;
  demo_url?: string;
  youtube_url?: string;
  pricing?: {
    sale_price: number;
    original_price: number;
    currency: "INR" | "USD";
  };
  delivery_time?: number;
  status?: "draft" | "pending" | "approved" | "suspended" | "archived";
  thumbnail?: string;
  images?: string[];
  files?: {
    source_files?: string[];
    documentation_files?: string[];
  };
  requirements?: {
    system_requirements?: string[];
    dependencies?: string[];
    installation_steps?: string[];
  };
  rating?: {
    average_rating?: number;
    total_ratings?: number;
    rating_distribution?: { [key: string]: number };
  };
  view_count?: number;
  purchase_count?: number;
  download_count?: number;
}

export interface UpdateProjectData {
  title?: string;
  description?: string;
  key_features?: string;
  category?: "web_development" | "mobile_development" | "desktop_application" | "ai_machine_learning" | "blockchain" | "game_development" | "data_science" | "devops" | "api_backend" | "automation_scripts" | "ui_ux_design" | "other";
  difficulty_level?: "beginner" | "intermediate" | "advanced" | "expert";
  tech_stack?: string[];
  github_url?: string;
  demo_url?: string;
  youtube_url?: string;
  pricing?: {
    sale_price: number;
    original_price: number;
    currency: "INR" | "USD";
  };
  delivery_time?: number;
  status?: "draft" | "pending" | "approved" | "suspended" | "archived";
  is_featured?: boolean;
  buyers?: string[];
  thumbnail?: string;
  images?: string[];
  files?: {
    source_files?: string[];
    documentation_files?: string[];
  };
  requirements?: {
    system_requirements?: string[];
    dependencies?: string[];
    installation_steps?: string[];
  };
  rating?: {
    average_rating?: number;
    total_ratings?: number;
    rating_distribution?: { [key: string]: number };
  };
  view_count?: number;
  purchase_count?: number;
  download_count?: number;
}

export interface ProjectFilters {
  category?: string[];
  author_id?: string;
  difficulty_level?: string[];
  tech_stack?: string[];
  status?: string[];
  is_featured?: boolean;
  min_price?: number;
  max_price?: number;
  currency?: "INR" | "USD";
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: "created_at" | "title" | "price" | "view_count" | "purchase_count" | "download_count";
  sort_order?: "asc" | "desc";
}

export const findById = async (id: string) => {
  try {
    if (!id || typeof id !== "string") {
      throw new ProjectRepositoryError("Invalid project ID parameter");
    }

    const result = await db.select().from(projects).where(eq(projects.id, id));
    if (!result.length) {
      throw new ProjectNotFoundError(`Project with ID ${id} not found`);
    }
    return result;
  } catch (error) {
    if (error instanceof ProjectRepositoryError) throw error;
    throw new ProjectRepositoryError(`Failed to find project by ID: ${error}`);
  }
};

export const findByAuthor = async (authorId: string, includeUnapproved = false) => {
  try {
    const whereConditions = [eq(projects.author_id, authorId)];
    if (!includeUnapproved) {
      whereConditions.push(eq(projects.status, "approved"));
    }

    return await db.select()
      .from(projects)
      .where(and(...whereConditions))
      .orderBy(desc(projects.created_at));
  } catch (error) {
    throw new ProjectRepositoryError(`Failed to find projects by author: ${error}`);
  }
};

export const findByCategory = async (category: string) => {
  try {
    return await db.select()
      .from(projects)
      .where(and(
        eq(projects.category, category as any),
        eq(projects.status, "approved")
      ))
      .orderBy(desc(projects.created_at));
  } catch (error) {
    throw new ProjectRepositoryError(`Failed to find projects by category: ${error}`);
  }
};

export const findFeatured = async (limit = 10) => {
  try {
    return await db.select()
      .from(projects)
      .where(and(
        eq(projects.is_featured, true),
        eq(projects.status, "approved")
      ))
      .orderBy(desc(projects.created_at))
      .limit(limit);
  } catch (error) {
    throw new ProjectRepositoryError(`Failed to find featured projects: ${error}`);
  }
};

export const findWithFilters = async (filters: ProjectFilters) => {
  try {
    const whereConditions = [];
    const { 
      category, author_id, difficulty_level, tech_stack, status, is_featured,
      min_price, max_price, currency, search, page = 1, limit = 10,
      sort_by = "created_at", sort_order = "desc"
    } = filters;

    // Basic filters
    if (author_id) whereConditions.push(eq(projects.author_id, author_id));
    if (is_featured !== undefined) whereConditions.push(eq(projects.is_featured, is_featured));

    // Array filters
    if (category && category.length > 0) {
      whereConditions.push(inArray(projects.category, category as any));
    }
    if (difficulty_level && difficulty_level.length > 0) {
      whereConditions.push(inArray(projects.difficulty_level, difficulty_level as any));
    }
    if (status && status.length > 0) {
      whereConditions.push(inArray(projects.status, status as any));
    }

    // Tech stack filter - check if any of the provided tech stacks exist in the project's tech_stack array
    if (tech_stack && tech_stack.length > 0) {
      const techStackConditions = tech_stack.map(tech => 
        sql`${tech} = ANY(${projects.tech_stack})`
      );
      whereConditions.push(sql`(${sql.join(techStackConditions, sql` OR `)})`);
    }

    // Price filters
    if (min_price !== undefined) {
      whereConditions.push(gte(sql`(${projects.pricing}->>'sale_price')::numeric`, min_price));
    }
    if (max_price !== undefined) {
      whereConditions.push(lte(sql`(${projects.pricing}->>'sale_price')::numeric`, max_price));
    }

    // Currency filter
    if (currency) {
      whereConditions.push(sql`${projects.pricing}->>'currency' = ${currency}`);
    }

    // Search filter - search in title, description, and tech_stack
    if (search) {
      whereConditions.push(
        sql`(
          ${projects.title} ILIKE ${`%${search}%`} OR 
          ${projects.description} ILIKE ${`%${search}%`} OR
          EXISTS (
            SELECT 1 FROM unnest(${projects.tech_stack}) AS tech 
            WHERE tech ILIKE ${`%${search}%`}
          )
        )`
      );
    }

    // Build base query with where conditions
    const baseQuery = db.select().from(projects);
    const queryWithWhere = whereConditions.length > 0 
      ? baseQuery.where(and(...whereConditions))
      : baseQuery;

    // Determine sort column and direction
    const getSortedQuery = () => {
      if (sort_by === "price") {
        const priceColumn = sql`(${projects.pricing}->>'sale_price')::numeric`;
        return sort_order === "asc" 
          ? queryWithWhere.orderBy(asc(priceColumn))
          : queryWithWhere.orderBy(desc(priceColumn));
      } else {
        // Explicitly handle each valid sort column
        switch (sort_by) {
          case "created_at":
            return sort_order === "asc"
              ? queryWithWhere.orderBy(asc(projects.created_at))
              : queryWithWhere.orderBy(desc(projects.created_at));
          case "title":
            return sort_order === "asc"
              ? queryWithWhere.orderBy(asc(projects.title))
              : queryWithWhere.orderBy(desc(projects.title));
          case "view_count":
            return sort_order === "asc"
              ? queryWithWhere.orderBy(asc(projects.view_count))
              : queryWithWhere.orderBy(desc(projects.view_count));
          case "purchase_count":
            return sort_order === "asc"
              ? queryWithWhere.orderBy(asc(projects.purchase_count))
              : queryWithWhere.orderBy(desc(projects.purchase_count));    
          case "download_count":
            return sort_order === "asc"
              ? queryWithWhere.orderBy(asc(projects.download_count))
              : queryWithWhere.orderBy(desc(projects.download_count));
          default:
            // Fallback to created_at
            return sort_order === "asc"
              ? queryWithWhere.orderBy(asc(projects.created_at))
              : queryWithWhere.orderBy(desc(projects.created_at));
        }
      }
    };

    // Get paginated results
    const offset = (page - 1) * limit;
    const results = await getSortedQuery().limit(limit).offset(offset);

    // Get total count for pagination
    const baseCountQuery = db.select({ count: sql`COUNT(*)`.as('count') }).from(projects);
    const countResults = whereConditions.length > 0 
      ? await baseCountQuery.where(and(...whereConditions))
      : await baseCountQuery;
    
    const totalCount = Number(countResults[0].count);

    return {
      data: results,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    };
  } catch (error) {
    throw new ProjectRepositoryError(`Failed to find projects with filters: ${error}`);
  }
};

export const createProject = async (projectData: CreateProjectData) => {
  try {
    if (!projectData.title || !projectData.description || !projectData.author_id) {
      throw new ProjectRepositoryError("Missing required fields: title, description, author_id");
    }

    const result = await db.insert(projects).values({
      ...projectData,
      title: projectData.title.trim(),
      tech_stack: projectData.tech_stack || [],
    }).returning();

    if (!result.length) {
      throw new ProjectRepositoryError("Failed to create project - no result returned");
    }
    return result;
  } catch (error: any) {
    if (error instanceof ProjectRepositoryError) throw error;
    throw new ProjectRepositoryError(`Failed to create project: ${error.message}`);
  }
};

export const updateProject = async (id: string, updateData: UpdateProjectData) => {
  try {
    if (!id || typeof id !== "string") {
      throw new ProjectRepositoryError("Invalid project ID parameter");
    }
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new ProjectRepositoryError("No update data provided");
    }

    const normalizedUpdate = { ...updateData };
    if (normalizedUpdate.title) {
      normalizedUpdate.title = normalizedUpdate.title.trim();
    }

    const result = await db.update(projects)
      .set(normalizedUpdate)
      .where(eq(projects.id, id))
      .returning();

    if (!result.length) {
      throw new ProjectNotFoundError(`Project with ID ${id} not found or no changes made`);
    }
    return result;
  } catch (error) {
    if (error instanceof ProjectRepositoryError) throw error;
    throw new ProjectRepositoryError(`Failed to update project: ${error}`);
  }
};

export const deleteProject = async (id: string) => {
  try {
    if (!id || typeof id !== "string") {
      throw new ProjectRepositoryError("Invalid project ID parameter");
    }

    const result = await db.delete(projects).where(eq(projects.id, id)).returning();
    if (!result.length) {
      throw new ProjectNotFoundError(`Project with ID ${id} not found`);
    }
    return result;
  } catch (error) {
    if (error instanceof ProjectRepositoryError) throw error;
    throw new ProjectRepositoryError(`Failed to delete project: ${error}`);
  }
};

export const incrementViewCount = async (id: string) => {
  try {
    await db.update(projects)
      .set({ view_count: sql`${projects.view_count} + 1` })
      .where(eq(projects.id, id));
  } catch (error) {
    throw new ProjectRepositoryError(`Failed to increment view count: ${error}`);
  }
};

export const incrementDownloadCount = async (id: string) => {
  try {
    await db.update(projects)
      .set({ download_count: sql`${projects.download_count} + 1` })
      .where(eq(projects.id, id));
  } catch (error) {
    throw new ProjectRepositoryError(`Failed to increment download count: ${error}`);
  }
};


export const addBuyer = async (projectId: string, buyerId: string) => {
  try {
    const [project] = await findById(projectId);
    const currentBuyers = project.buyers || [];
    
    if (!currentBuyers.includes(buyerId)) {
      const updatedBuyers = [...currentBuyers, buyerId];
      await db.update(projects)
        .set({ 
          buyers: updatedBuyers,
          purchase_count: sql`${projects.purchase_count} + 1`
        })
        .where(eq(projects.id, projectId));
    }
  } catch (error) {
    throw new ProjectRepositoryError(`Failed to add buyer: ${error}`);
  }
};

export const checkUserPurchased = async (projectId: string, userId: string): Promise<boolean> => {
  try {
    const [project] = await findById(projectId);
    return (project.buyers || []).includes(userId);
  } catch (error) {
    return false;
  }
};

export const findRelatedProjects = async (
  projectId: string, 
  techStack: string[], 
  category: string,
  limit = 4
) => {
  try {
    if (!projectId || typeof projectId !== "string") {
      throw new ProjectRepositoryError("Invalid project ID parameter");
    }
    
    if (!techStack || techStack.length === 0) {
      // Fallback to category-based related projects if no tech stack
      return await db.select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        category: projects.category,
        tech_stack: projects.tech_stack,
        thumbnail: projects.thumbnail,
        pricing: projects.pricing,
        difficulty_level: projects.difficulty_level,
        rating: projects.rating,
        view_count: projects.view_count,
        purchase_count: projects.purchase_count,
      })
      .from(projects)
      .where(
        and(
          ne(projects.id, projectId),
          eq(projects.category, category as any),
          eq(projects.status, "approved")
        )
      )
      .orderBy(desc(projects.view_count))
      .limit(limit);
    }

    // Find projects with overlapping tech stack using array overlap operator
    const techStackConditions = techStack.map(tech => 
      sql`${tech} = ANY(${projects.tech_stack})`
    );
    
    return await db.select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      category: projects.category,
      tech_stack: projects.tech_stack,
      thumbnail: projects.thumbnail,
      pricing: projects.pricing,
      difficulty_level: projects.difficulty_level,
      rating: projects.rating,
      view_count: projects.view_count,
      purchase_count: projects.purchase_count,
    })
    .from(projects)
    .where(
      and(
        ne(projects.id, projectId),
        sql`(${sql.join(techStackConditions, sql` OR `)})`,
        eq(projects.status, "approved")
      )
    )
    .orderBy(desc(projects.view_count))
    .limit(limit);
  } catch (error) {
    if (error instanceof ProjectRepositoryError) throw error;
    throw new ProjectRepositoryError(`Failed to find related projects: ${error}`);
  }
};


export { ProjectRepositoryError, ProjectNotFoundError };