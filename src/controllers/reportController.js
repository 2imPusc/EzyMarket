import reportService from '../services/reportService.js';

export const reportController = {
  // Báo cáo tổng quan Dashboard
  overview: async (req, res) => {
    try {
      const userId = req.user.id;
      const data = await reportService.getOverview(userId);
      res.json(data);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  },

  // Báo cáo chi tiêu Shopping
  spendingReport: async (req, res) => {
    try {
      const userId = req.user.id;
      const { startDate, endDate, groupBy = 'month' } = req.query;
      const data = await reportService.getSpendingReport(userId, {
        startDate,
        endDate,
        groupBy,
      });
      res.json(data);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  },

  // Báo cáo Meal Planning
  mealPlanReport: async (req, res) => {
    try {
      const userId = req.user.id;
      const { startDate, endDate, period = 'month' } = req.query;
      const data = await reportService.getMealPlanReport(userId, {
        startDate,
        endDate,
        period,
      });
      res.json(data);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  },

  // Báo cáo Recipe Usage
  recipeUsageStats: async (req, res) => {
    try {
      const userId = req.user.id;
      const { period = 'month', limit = 10 } = req.query;
      const data = await reportService.getRecipeUsageStats(userId, {
        period,
        limit: parseInt(limit),
      });
      res.json(data);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  },

  // Báo cáo Expiry Tracking
  expiryTracking: async (req, res) => {
    try {
      const userId = req.user.id;
      const { period = 'week' } = req.query;
      const data = await reportService.getExpiryTracking(userId, period);
      res.json(data);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  },

  // Báo cáo Food Waste Analysis
  wasteAnalysis: async (req, res) => {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;
      const data = await reportService.getWasteAnalysis(userId, {
        startDate,
        endDate,
      });
      res.json(data);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  },
};
