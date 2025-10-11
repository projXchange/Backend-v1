// repository/dashboard.repository.ts
import { eq, and, sql, gte, desc } from "drizzle-orm";
import { users, projects, transactions, wishlists, downloads, reviews } from "../models/schema";
import db from "./db";

class DashboardRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DashboardRepositoryError";
  }
}

export interface DashboardStats {
  user_performance: {
    projects_owned: number;
    total_purchases: number;
    wishlist_items: number;
    average_rating: number;
  };
  monthly_activity: {
    new_projects_created: number;
    downloads_received: number;
    new_projects_purchased: number;
  };
  revenue_financial: {
    total_revenue_earned: number;
    monthly_revenue_trend: Array<{ month: string; revenue: number }>;
    average_sale_price: number;
  };
  project_performance: {
    best_performing_project: {
      id: string;
      title: string;
      total_sales: number;
      total_downloads: number;
      total_views: number;
    } | null;
    view_to_purchase_conversion: number;
    average_project_rating: number;
    downloads_vs_purchases_ratio: number;
  };
  engagement_metrics: {
    total_project_views: number;
    wishlist_to_purchase_conversion: number;
    review_count: number;
    positive_review_percentage: number;
    repeat_customer_count: number;
    repeat_customer_percentage: number;
  };
}

// Get user performance metrics
export const getUserPerformanceMetrics = async (userId: string) => {
  try {
    // Projects owned count
    const projectsOwnedResult = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(projects)
      .where(eq(projects.author_id, userId));

    // Total purchases count
    const totalPurchasesResult = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.user_id, userId),
          eq(transactions.type, "purchase"),
          eq(transactions.status, "completed")
        )
      );

    // Wishlist items count
    const wishlistItemsResult = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(wishlists)
      .where(eq(wishlists.user_id, userId));

    // Get user's average rating
    const userResult = await db
      .select({ rating: users.rating })
      .from(users)
      .where(eq(users.id, userId));

    return {
      projects_owned: projectsOwnedResult[0]?.count || 0,
      total_purchases: totalPurchasesResult[0]?.count || 0,
      wishlist_items: wishlistItemsResult[0]?.count || 0,
      average_rating: userResult[0]?.rating || 0,
    };
  } catch (error) {
    throw new DashboardRepositoryError(`Failed to get user performance metrics: ${error}`);
  }
};

// Get monthly activity (last 30 days)
export const getMonthlyActivity = async (userId: string) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // New projects created
    const newProjectsResult = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(projects)
      .where(
        and(
          eq(projects.author_id, userId),
          gte(projects.created_at, thirtyDaysAgo)
        )
      );

    // Downloads received on user's projects
    const downloadsReceivedResult = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(downloads)
      .innerJoin(projects, eq(downloads.project_id, projects.id))
      .where(
        and(
          eq(projects.author_id, userId),
          gte(downloads.created_at, thirtyDaysAgo)
        )
      );

    // New projects purchased by user
    const newPurchasesResult = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.user_id, userId),
          eq(transactions.type, "purchase"),
          eq(transactions.status, "completed"),
          gte(transactions.created_at, thirtyDaysAgo)
        )
      );

    return {
      new_projects_created: newProjectsResult[0]?.count || 0,
      downloads_received: downloadsReceivedResult[0]?.count || 0,
      new_projects_purchased: newPurchasesResult[0]?.count || 0,
    };
  } catch (error) {
    throw new DashboardRepositoryError(`Failed to get monthly activity: ${error}`);
  }
};

// Get revenue and financial metrics
export const getRevenueFinancialMetrics = async (userId: string, monthsBack: number = 6) => {
  try {
    // Total revenue earned
    const totalRevenueResult = await db
      .select({ 
        total: sql<string>`coalesce(sum(${transactions.author_amount}), 0)` 
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.author_id, userId),
          eq(transactions.type, "purchase"),
          eq(transactions.status, "completed")
        )
      );

    const totalRevenue = parseFloat(totalRevenueResult[0]?.total || "0");

    // Monthly revenue trend
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    const monthlyRevenueResult = await db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${transactions.created_at}), 'YYYY-MM')`,
        revenue: sql<string>`coalesce(sum(${transactions.author_amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.author_id, userId),
          eq(transactions.type, "purchase"),
          eq(transactions.status, "completed"),
          gte(transactions.created_at, startDate)
        )
      )
      .groupBy(sql`date_trunc('month', ${transactions.created_at})`)
      .orderBy(sql`date_trunc('month', ${transactions.created_at})`);

    const monthlyRevenueTrend = monthlyRevenueResult.map(row => ({
      month: row.month,
      revenue: parseFloat(row.revenue),
    }));

    // Average sale price
    const avgSalePriceResult = await db
      .select({
        avg_price: sql<string>`coalesce(avg(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.author_id, userId),
          eq(transactions.type, "purchase"),
          eq(transactions.status, "completed")
        )
      );

    const averageSalePrice = parseFloat(avgSalePriceResult[0]?.avg_price || "0");

    return {
      total_revenue_earned: totalRevenue,
      monthly_revenue_trend: monthlyRevenueTrend,
      average_sale_price: averageSalePrice,
    };
  } catch (error) {
    throw new DashboardRepositoryError(`Failed to get revenue metrics: ${error}`);
  }
};

// Get project performance metrics
export const getProjectPerformanceMetrics = async (userId: string) => {
  try {
    // Best performing project by sales
    const bestProjectResult = await db
      .select({
        id: projects.id,
        title: projects.title,
        total_sales: projects.purchase_count,
        total_downloads: projects.download_count,
        total_views: projects.view_count,
      })
      .from(projects)
      .where(eq(projects.author_id, userId))
      .orderBy(desc(projects.purchase_count), desc(projects.view_count))
      .limit(1);

    const bestProject = bestProjectResult.length > 0 ? bestProjectResult[0] : null;

    // View to purchase conversion rate
    const conversionResult = await db
      .select({
        total_views: sql<number>`cast(coalesce(sum(${projects.view_count}), 0) as int)`,
        total_purchases: sql<number>`cast(coalesce(sum(${projects.purchase_count}), 0) as int)`,
      })
      .from(projects)
      .where(eq(projects.author_id, userId));

    const totalViews = conversionResult[0]?.total_views || 0;
    const totalPurchases = conversionResult[0]?.total_purchases || 0;
    const conversionRate = totalViews > 0 ? (totalPurchases / totalViews) * 100 : 0;

    // Average project rating
    const avgRatingResult = await db
      .select({
        avg_rating: sql<string>`coalesce(
          avg((${projects.rating}->>'average_rating')::numeric), 
          0
        )`,
      })
      .from(projects)
      .where(
        and(
          eq(projects.author_id, userId),
          sql`${projects.rating}->>'average_rating' IS NOT NULL`
        )
      );

    const averageProjectRating = parseFloat(avgRatingResult[0]?.avg_rating || "0");

    // Downloads vs purchases ratio
    const totalDownloads = await db
      .select({
        total: sql<number>`cast(coalesce(sum(${projects.download_count}), 0) as int)`,
      })
      .from(projects)
      .where(eq(projects.author_id, userId));

    const downloadsCount = totalDownloads[0]?.total || 0;
    const downloadsVsPurchasesRatio = totalPurchases > 0 ? downloadsCount / totalPurchases : 0;

    return {
      best_performing_project: bestProject,
      view_to_purchase_conversion: parseFloat(conversionRate.toFixed(2)),
      average_project_rating: parseFloat(averageProjectRating.toFixed(2)),
      downloads_vs_purchases_ratio: parseFloat(downloadsVsPurchasesRatio.toFixed(2)),
    };
  } catch (error) {
    throw new DashboardRepositoryError(`Failed to get project performance metrics: ${error}`);
  }
};

// Get engagement metrics
export const getEngagementMetrics = async (userId: string) => {
  try {
    // Total project views
    const totalViewsResult = await db
      .select({
        total: sql<number>`cast(coalesce(sum(${projects.view_count}), 0) as int)`,
      })
      .from(projects)
      .where(eq(projects.author_id, userId));

    const totalProjectViews = totalViewsResult[0]?.total || 0;

    // Wishlist to purchase conversion
    const wishlistConversionResult = await db
      .select({
        wishlist_count: sql<number>`cast(count(distinct ${wishlists.user_id}) as int)`,
        purchase_count: sql<number>`cast(count(distinct ${transactions.user_id}) as int)`,
      })
      .from(wishlists)
      .innerJoin(projects, eq(wishlists.project_id, projects.id))
      .leftJoin(
        transactions,
        and(
          eq(transactions.project_id, wishlists.project_id),
          eq(transactions.user_id, wishlists.user_id),
          eq(transactions.type, "purchase"),
          eq(transactions.status, "completed")
        )
      )
      .where(eq(projects.author_id, userId));

    const wishlistCount = wishlistConversionResult[0]?.wishlist_count || 0;
    const purchaseFromWishlistCount = wishlistConversionResult[0]?.purchase_count || 0;
    const wishlistToPurchaseConversion = wishlistCount > 0 
      ? (purchaseFromWishlistCount / wishlistCount) * 100 
      : 0;

    // Review count and sentiment
    const reviewStatsResult = await db
      .select({
        total_reviews: sql<number>`cast(count(*) as int)`,
        positive_reviews: sql<number>`cast(count(*) filter (where ${reviews.rating} >= 4) as int)`,
      })
      .from(reviews)
      .innerJoin(projects, eq(reviews.project_id, projects.id))
      .where(
        and(
          eq(projects.author_id, userId),
          eq(reviews.is_approved, true)
        )
      );

    const totalReviews = reviewStatsResult[0]?.total_reviews || 0;
    const positiveReviews = reviewStatsResult[0]?.positive_reviews || 0;
    const positiveReviewPercentage = totalReviews > 0 
      ? (positiveReviews / totalReviews) * 100 
      : 0;

    // Repeat customer metrics
    const repeatCustomerResult = await db
      .select({
        customer_id: transactions.user_id,
        purchase_count: sql<number>`cast(count(*) as int)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.author_id, userId),
          eq(transactions.type, "purchase"),
          eq(transactions.status, "completed")
        )
      )
      .groupBy(transactions.user_id)
      .having(sql`count(*) > 1`);

    const repeatCustomerCount = repeatCustomerResult.length;

    // Total unique customers
    const totalCustomersResult = await db
      .select({
        count: sql<number>`cast(count(distinct ${transactions.user_id}) as int)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.author_id, userId),
          eq(transactions.type, "purchase"),
          eq(transactions.status, "completed")
        )
      );

    const totalCustomers = totalCustomersResult[0]?.count || 0;
    const repeatCustomerPercentage = totalCustomers > 0 
      ? (repeatCustomerCount / totalCustomers) * 100 
      : 0;

    return {
      total_project_views: totalProjectViews,
      wishlist_to_purchase_conversion: parseFloat(wishlistToPurchaseConversion.toFixed(2)),
      review_count: totalReviews,
      positive_review_percentage: parseFloat(positiveReviewPercentage.toFixed(2)),
      repeat_customer_count: repeatCustomerCount,
      repeat_customer_percentage: parseFloat(repeatCustomerPercentage.toFixed(2)),
    };
  } catch (error) {
    throw new DashboardRepositoryError(`Failed to get engagement metrics: ${error}`);
  }
};

// Main function to get all dashboard stats
export const getDashboardStats = async (
  userId: string, 
  monthsBack: number = 6
): Promise<DashboardStats> => {
  try {
    const [
      userPerformance,
      monthlyActivity,
      revenueFinancial,
      projectPerformance,
      engagementMetrics,
    ] = await Promise.all([
      getUserPerformanceMetrics(userId),
      getMonthlyActivity(userId),
      getRevenueFinancialMetrics(userId, monthsBack),
      getProjectPerformanceMetrics(userId),
      getEngagementMetrics(userId),
    ]);

    return {
      user_performance: userPerformance,
      monthly_activity: monthlyActivity,
      revenue_financial: revenueFinancial,
      project_performance: projectPerformance,
      engagement_metrics: engagementMetrics,
    };
  } catch (error) {
    throw new DashboardRepositoryError(`Failed to get dashboard stats: ${error}`);
  }
};

export { DashboardRepositoryError };
