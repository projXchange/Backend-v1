// repository/downloads.repository.ts
import { eq, and, desc, sql } from "drizzle-orm";
import { downloads, projects } from "../models/schema";
import db from "./db";

class DownloadRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DownloadRepositoryError";
  }
}

export interface CreateDownloadData {
  user_id: string;
  project_id: string;
  download_type?: "full" | "demo" | "preview";
  ip_address?: string;
  user_agent?: string;
}

export const findByUser = async (userId: string) => {
  try {
    if (!userId || typeof userId !== "string") {
      throw new DownloadRepositoryError("Invalid user ID parameter");
    }

    return await db.select({
      id: downloads.id,
      project_id: downloads.project_id,
      download_type: downloads.download_type,
      created_at: downloads.created_at,
      project: projects
    })
    .from(downloads)
    .innerJoin(projects, eq(downloads.project_id, projects.id))
    .where(eq(downloads.user_id, userId))
    .orderBy(desc(downloads.created_at));
  } catch (error) {
    throw new DownloadRepositoryError(`Failed to find user downloads: ${error}`);
  }
};

export const findByProject = async (projectId: string) => {
  try {
    if (!projectId || typeof projectId !== "string") {
      throw new DownloadRepositoryError("Invalid project ID parameter");
    }

    return await db.select()
      .from(downloads)
      .where(eq(downloads.project_id, projectId))
      .orderBy(desc(downloads.created_at));
  } catch (error) {
    throw new DownloadRepositoryError(`Failed to find project downloads: ${error}`);
  }
};

export const createDownload = async (downloadData: CreateDownloadData) => {
  try {
    if (!downloadData.user_id || !downloadData.project_id) {
      throw new DownloadRepositoryError("User ID and Project ID are required");
    }

    const result = await db.insert(downloads).values({
      ...downloadData,
      download_type: downloadData.download_type || "full"
    }).returning();

    if (!result.length) {
      throw new DownloadRepositoryError("Failed to create download record");
    }
    return result;
  } catch (error: any) {
    if (error instanceof DownloadRepositoryError) throw error;
    throw new DownloadRepositoryError(`Failed to create download record: ${error.message}`);
  }
};

export const getDownloadStats = async (projectId: string) => {
  try {
    const stats = await db.select({
      total_downloads: sql<number>`COUNT(*)`,
      unique_downloads: sql<number>`COUNT(DISTINCT ${downloads.user_id})`,
      full_downloads: sql<number>`COUNT(*) FILTER (WHERE ${downloads.download_type} = 'full')`,
      demo_downloads: sql<number>`COUNT(*) FILTER (WHERE ${downloads.download_type} = 'demo')`,
      preview_downloads: sql<number>`COUNT(*) FILTER (WHERE ${downloads.download_type} = 'preview')`
    })
    .from(downloads)
    .where(eq(downloads.project_id, projectId));

    return stats[0];
  } catch (error) {
    throw new DownloadRepositoryError(`Failed to get download stats: ${error}`);
  }
};

export const getUserDownloadHistory = async (userId: string, projectId: string) => {
  try {
    return await db.select()
      .from(downloads)
      .where(and(
        eq(downloads.user_id, userId),
        eq(downloads.project_id, projectId)
      ))
      .orderBy(desc(downloads.created_at));
  } catch (error) {
    throw new DownloadRepositoryError(`Failed to get user download history: ${error}`);
  }
};

export { DownloadRepositoryError };
