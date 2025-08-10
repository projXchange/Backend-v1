import { eq } from "drizzle-orm";
import { projects_dump } from "../models/schema";
import db from "./db";

class ProjectsDumpRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectsDumpRepositoryError";
  }
}

class ProjectsDumpNotFoundError extends ProjectsDumpRepositoryError {
  constructor(message = "Project dump record not found") {
    super(message);
    this.name = "ProjectsDumpNotFoundError";
  }
}

export interface CreateProjectsDumpData {
  id: string; // project_id
  thumbnail?: string;
  images?: string[];
  demo_video?: string;
  features?: string[];
  tags?: string[];
  files?: {
    source_files?: string[];
    documentation_files?: string[];
    assets?: string[];
    size_mb?: number;
  };
  requirements?: {
    system_requirements?: string[];
    dependencies?: string[];
    installation_steps?: string[];
  };
  stats?: {
    total_downloads?: number;
    total_views?: number;
    total_likes?: number;
    completion_rate?: number;
  };
  rating?: {
    average_rating?: number;
    total_ratings?: number;
    rating_distribution?: { [key: string]: number };
  };
}

export interface UpdateProjectsDumpData {
  thumbnail?: string;
  images?: string[];
  demo_video?: string;
  features?: string[];
  tags?: string[];
  files?: {
    source_files?: string[];
    documentation_files?: string[];
    assets?: string[];
    size_mb?: number;
  };
  requirements?: {
    system_requirements?: string[];
    dependencies?: string[];
    installation_steps?: string[];
  };
  stats?: {
    total_downloads?: number;
    total_views?: number;
    total_likes?: number;
    completion_rate?: number;
  };
  rating?: {
    average_rating?: number;
    total_ratings?: number;
    rating_distribution?: { [key: string]: number };
  };
}

export const findById = async (id: string) => {
  try {
    if (!id || typeof id !== "string") {
      throw new ProjectsDumpRepositoryError("Invalid project ID parameter");
    }

    const result = await db.select().from(projects_dump).where(eq(projects_dump.id, id));
    if (!result.length) {
      throw new ProjectsDumpNotFoundError(`Project dump record with ID ${id} not found`);
    }
    return result;
  } catch (error) {
    if (error instanceof ProjectsDumpRepositoryError) throw error;
    throw new ProjectsDumpRepositoryError(`Failed to find project dump by ID: ${error}`);
  }
};

export const findAll = async () => {
  try {
    return await db.select().from(projects_dump);
  } catch (error) {
    throw new ProjectsDumpRepositoryError(`Failed to fetch project dump records: ${error}`);
  }
};

export const createProjectsDump = async (dumpData: CreateProjectsDumpData) => {
  try {
    if (!dumpData.id) {
      throw new ProjectsDumpRepositoryError("Missing required field: id (project_id)");
    }

    const result = await db.insert(projects_dump).values({
      ...dumpData,
      features: dumpData.features || [],
      tags: dumpData.tags || [],
      images: dumpData.images || [],
    }).returning();

    if (!result.length) {
      throw new ProjectsDumpRepositoryError("Failed to create project dump record - no result returned");
    }
    return result;
  } catch (error: any) {
    if (error.code === '23505') {
      throw new ProjectsDumpRepositoryError("Project dump record already exists for this project");
    }
    if (error instanceof ProjectsDumpRepositoryError) throw error;
    throw new ProjectsDumpRepositoryError(`Failed to create project dump record: ${error.message}`);
  }
};

export const updateProjectsDump = async (id: string, updateData: UpdateProjectsDumpData) => {
  try {
    if (!id || typeof id !== "string") {
      throw new ProjectsDumpRepositoryError("Invalid project ID parameter");
    }
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new ProjectsDumpRepositoryError("No update data provided");
    }

    const result = await db.update(projects_dump)
      .set(updateData)
      .where(eq(projects_dump.id, id))
      .returning();

    if (!result.length) {
      throw new ProjectsDumpNotFoundError(`Project dump record with ID ${id} not found or no changes made`);
    }
    return result;
  } catch (error) {
    if (error instanceof ProjectsDumpRepositoryError) throw error;
    throw new ProjectsDumpRepositoryError(`Failed to update project dump record: ${error}`);
  }
};

export const deleteProjectsDump = async (id: string) => {
  try {
    if (!id || typeof id !== "string") {
      throw new ProjectsDumpRepositoryError("Invalid project ID parameter");
    }

    const result = await db.delete(projects_dump).where(eq(projects_dump.id, id)).returning();
    if (!result.length) {
      throw new ProjectsDumpNotFoundError(`Project dump record with ID ${id} not found`);
    }
    return result;
  } catch (error) {
    if (error instanceof ProjectsDumpRepositoryError) throw error;
    throw new ProjectsDumpRepositoryError(`Failed to delete project dump record: ${error}`);
  }
};

export { ProjectsDumpRepositoryError, ProjectsDumpNotFoundError };
