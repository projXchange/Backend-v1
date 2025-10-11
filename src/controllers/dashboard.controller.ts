// controllers/dashboard.controller.ts
import { getDashboardStats } from "../repository/dashboard.repository";

export const getUserDashboardStats = async (c: any) => {
  try {
    const userId = c.get("userId");
    const { months_back } = c.req.query();
    
    // Default to 6 months, validate between 3 and 12
    let monthsBack = 6;
    if (months_back) {
      const parsed = parseInt(months_back, 10);
      if (!isNaN(parsed) && parsed >= 3 && parsed <= 12) {
        monthsBack = parsed;
      }
    }

    const stats = await getDashboardStats(userId, monthsBack);

    return c.json({ 
      success: true,
      stats 
    });
  } catch (error: any) {
    c.logger.error("Failed to fetch dashboard stats", error, {
      userId: c.get("userId"),
      action: 'get_dashboard_stats'
    });
    return c.json({ 
      error: error.message || "Failed to fetch dashboard statistics" 
    }, 500);
  }
};
