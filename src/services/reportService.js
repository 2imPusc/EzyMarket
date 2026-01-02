import FridgeItem from '../model/fridgeItemRepository.js';
import Recipe from '../model/recipeRepository.js';
import MealPlan from '../model/mealPlanRepository.js';
import ShoppingList from '../model/shoppingRepository.js';
import Group from '../model/groupRepository.js';
import { startOfLocalDay, endOfLocalDay, localDayKey } from '../utils/time.js';

const reportService = {
  /**
   * Báo cáo tổng quan Dashboard
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async getOverview(userId) {
    // Get user's group if exists
    const group = await Group.findOne({
      members: { $elemMatch: { userId, status: 'active' } },
    });
    const groupId = group?._id || null;

    // Fridge Statistics
    const fridgeQuery = groupId ? { groupId } : { userId, groupId: null };
    const allFridgeItems = await FridgeItem.find(fridgeQuery);

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const fridgeStats = {
      totalItems: allFridgeItems.length,
      inStock: allFridgeItems.filter((item) => item.status === 'in-stock').length,
      expired: allFridgeItems.filter((item) => item.status === 'expired').length,
      expiringSoon: allFridgeItems.filter(
        (item) =>
          item.status === 'in-stock' &&
          item.expiryDate &&
          item.expiryDate > now &&
          item.expiryDate <= sevenDaysFromNow
      ).length,
      totalValue: allFridgeItems
        .filter((item) => item.status === 'in-stock')
        .reduce((sum, item) => sum + (item.price || 0), 0),
    };

    // Recipe Statistics
    const personalRecipes = await Recipe.countDocuments({ creatorId: userId });
    const systemRecipes = await Recipe.countDocuments({ creatorId: null });

    const recipeStats = {
      totalRecipes: personalRecipes + systemRecipes,
      personalRecipes,
      systemRecipes,
    };

    // Meal Plan Statistics
    const startOfWeek = startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()));
    const startOfMonth = startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), 1));

    const mealPlansThisWeek = await MealPlan.countDocuments({ userId, date: { $gte: startOfWeek } });
    const mealPlansThisMonth = await MealPlan.countDocuments({ userId, date: { $gte: startOfMonth } });

    // Calculate completion rate
    const mealPlansWithItems = await MealPlan.find({
      userId,
      date: { $gte: startOfMonth },
    });

    let totalMeals = 0;
    let eatenMeals = 0;

    mealPlansWithItems.forEach((plan) => {
      plan.meals.forEach((meal) => {
        meal.items.forEach((item) => {
          totalMeals++;
          if (item.isEaten) eatenMeals++;
        });
      });
    });

    const mealPlanStats = {
      thisWeek: mealPlansThisWeek,
      thisMonth: mealPlansThisMonth,
      completionRate: totalMeals > 0 ? Math.round((eatenMeals / totalMeals) * 100) : 0,
    };

    // Shopping Statistics
    const shoppingQuery = groupId ? { groupId } : { creatorId: userId, groupId: null };

    const activeLists = await ShoppingList.countDocuments({
      ...shoppingQuery,
      status: 'active',
    });

    const completedLists = await ShoppingList.countDocuments({
      ...shoppingQuery,
      status: 'completed',
    });

    const completedListsData = await ShoppingList.find({
      ...shoppingQuery,
      status: 'completed',
    });

    let totalSpending = 0;
    completedListsData.forEach((list) => {
      list.items.forEach((item) => {
        if (item.isPurchased && item.price) {
          totalSpending += item.price * item.quantity;
        }
      });
    });

    const shoppingStats = {
      activeLists,
      completedLists,
      totalSpending: Math.round(totalSpending * 100) / 100,
    };

    return {
      fridgeStats,
      recipeStats,
      mealPlanStats,
      shoppingStats,
    };
  },

  /**
   * Báo cáo chi tiêu Shopping
   * @param {string} userId
   * @param {object} options
   * @returns {Promise<object>}
   */
  async getSpendingReport(userId, options) {
    const { startDate, endDate, groupBy = 'month' } = options;

    // Get user's group if exists
    const group = await Group.findOne({
      members: { $elemMatch: { userId, status: 'active' } },
    });
    const groupId = group?._id || null;

    // Build query
    const query = groupId ? { groupId } : { creatorId: userId, groupId: null };

    // Add date filter if provided
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startOfLocalDay(startDate);
      if (endDate) query.createdAt.$lte = endOfLocalDay(endDate);
    } else {
      // Default to last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      query.createdAt = { $gte: sixMonthsAgo };
    }

    const shoppingLists = await ShoppingList.find(query)
      .populate('items.ingredientId', 'name category')
      .sort({ createdAt: 1 });

    // Calculate spending by time period
    const spendingByPeriod = {};
    const spendingByCategory = {};
    let totalSpending = 0;
    let itemCount = 0;

    shoppingLists.forEach((list) => {
      list.items.forEach((item) => {
        if (item.isPurchased && item.price) {
          const amount = item.price * item.quantity;
          totalSpending += amount;
          itemCount++;

          // Group by time period (dùng key theo local, bỏ UTC ISO)
          const date = list.createdAt;
          let periodKey;

          if (groupBy === 'day') {
            periodKey = localDayKey(date);
          } else if (groupBy === 'week') {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            periodKey = localDayKey(weekStart);
          } else {
            // month theo local
            periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          }

          spendingByPeriod[periodKey] = (spendingByPeriod[periodKey] || 0) + amount;

          // Group by category
          const category = item.ingredientId?.category || 'Other';
          spendingByCategory[category] = (spendingByCategory[category] || 0) + amount;
        }
      });
    });

    // Convert to arrays for easier chart rendering
    const spendingTimeSeries = Object.entries(spendingByPeriod)
      .map(([period, amount]) => ({
        period,
        amount: Math.round(amount * 100) / 100,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    const spendingByCategories = Object.entries(spendingByCategory)
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
        percentage: Math.round((amount / totalSpending) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);

    // Calculate average spending
    const periodsCount = Object.keys(spendingByPeriod).length || 1;
    const averageSpending = totalSpending / periodsCount;

    // Compare with previous period
    let previousPeriodSpending = 0;
    let currentPeriodSpending = 0;

    if (spendingTimeSeries.length >= 2) {
      currentPeriodSpending = spendingTimeSeries[spendingTimeSeries.length - 1].amount;
      previousPeriodSpending = spendingTimeSeries[spendingTimeSeries.length - 2].amount;
    }

    const changePercentage =
      previousPeriodSpending > 0
        ? Math.round(
            ((currentPeriodSpending - previousPeriodSpending) / previousPeriodSpending) * 100
          )
        : 0;

    return {
      summary: {
        totalSpending: Math.round(totalSpending * 100) / 100,
        averageSpending: Math.round(averageSpending * 100) / 100,
        itemCount,
        periodsCount,
        changePercentage,
      },
      spendingTimeSeries,
      spendingByCategories,
    };
  },

  /**
   * Báo cáo Meal Planning
   * @param {string} userId
   * @param {object} options
   * @returns {Promise<object>}
   */
  async getMealPlanReport(userId, options) {
    const { startDate, endDate, period = 'month' } = options;
    const query = { userId };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startOfLocalDay(startDate);
      if (endDate) query.date.$lte = endOfLocalDay(endDate);
    } else {
      // Default to current month (cuối ngày local)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfMonth, $lte: endOfMonth };
    }

    const mealPlans = await MealPlan.find(query)
      .populate('meals.items.recipeId', 'title')
      .populate('meals.items.ingredientId', 'name')
      .sort({ date: 1 });

    // Statistics
    let totalMeals = 0;
    let eatenMeals = 0;
    let skippedDays = 0;
    const mealTypeDistribution = {
      breakfast: { total: 0, eaten: 0 },
      lunch: { total: 0, eaten: 0 },
      dinner: { total: 0, eaten: 0 },
      snack: { total: 0, eaten: 0 },
    };
    const recipeUsage = {};
    const ingredientUsage = {};

    mealPlans.forEach((plan) => {
      let hasAnyMeal = false;

      plan.meals.forEach((meal) => {
        meal.items.forEach((item) => {
          hasAnyMeal = true;
          totalMeals++;
          mealTypeDistribution[meal.mealType].total++;

          if (item.isEaten) {
            eatenMeals++;
            mealTypeDistribution[meal.mealType].eaten++;
          }

          // Track recipe usage
          if (item.itemType === 'recipe' && item.recipeId) {
            const recipeTitle = item.recipeId.title || 'Unknown';
            recipeUsage[recipeTitle] = (recipeUsage[recipeTitle] || 0) + 1;
          }

          // Track ingredient usage
          if (item.itemType === 'ingredient' && item.ingredientId) {
            const ingredientName = item.ingredientId.name || 'Unknown';
            ingredientUsage[ingredientName] = (ingredientUsage[ingredientName] || 0) + 1;
          }
        });
      });

      if (!hasAnyMeal) skippedDays++;
    });

    // Completion rate
    const completionRate = totalMeals > 0 ? Math.round((eatenMeals / totalMeals) * 100) : 0;

    // Top recipes
    const topRecipes = Object.entries(recipeUsage)
      .map(([recipe, count]) => ({ recipe, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top ingredients
    const topIngredients = Object.entries(ingredientUsage)
      .map(([ingredient, count]) => ({ ingredient, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Meal type completion rates
    const mealTypeStats = Object.entries(mealTypeDistribution).map(([type, stats]) => ({
      mealType: type,
      total: stats.total,
      eaten: stats.eaten,
      completionRate: stats.total > 0 ? Math.round((stats.eaten / stats.total) * 100) : 0,
    }));

    return {
      summary: {
        totalDays: mealPlans.length,
        totalMeals,
        eatenMeals,
        skippedDays,
        completionRate,
      },
      mealTypeStats,
      topRecipes,
      topIngredients,
    };
  },

  /**
   * Báo cáo Recipe Usage
   * @param {string} userId
   * @param {object} options
   * @returns {Promise<object>}
   */
  async getRecipeUsageStats(userId, options) {
    const { period = 'month', limit = 10 } = options;

    // Determine date range
    const now = new Date();
    let startDate;

    if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else if (period === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
    } else {
      // month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get meal plans in the period
    const mealPlans = await MealPlan.find({
      userId,
      date: { $gte: startDate, $lte: now },
    }).populate('meals.items.recipeId', 'title tags');

    // Count recipe usage
    const recipeUsage = {};
    const tagUsage = {};

    mealPlans.forEach((plan) => {
      plan.meals.forEach((meal) => {
        meal.items.forEach((item) => {
          if (item.itemType === 'recipe' && item.recipeId) {
            const recipeId = item.recipeId._id.toString();
            const recipeTitle = item.recipeId.title;

            if (!recipeUsage[recipeId]) {
              recipeUsage[recipeId] = {
                recipeId,
                title: recipeTitle,
                count: 0,
                tags: item.recipeId.tags || [],
              };
            }
            recipeUsage[recipeId].count++;

            // Count tag usage
            if (item.recipeId.tags) {
              item.recipeId.tags.forEach((tag) => {
                const tagId = tag.toString();
                tagUsage[tagId] = (tagUsage[tagId] || 0) + 1;
              });
            }
          }
        });
      });
    });

    // Get all user's recipes (personal + system)
    const allRecipes = await Recipe.find({
      $or: [{ creatorId: userId }, { creatorId: null }],
    }).select('_id title');

    const usedRecipeIds = Object.keys(recipeUsage);
    const unusedRecipes = allRecipes
      .filter((recipe) => !usedRecipeIds.includes(recipe._id.toString()))
      .map((recipe) => ({
        recipeId: recipe._id,
        title: recipe.title,
      }))
      .slice(0, limit);

    // Top recipes
    const topRecipes = Object.values(recipeUsage)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return {
      summary: {
        totalRecipes: allRecipes.length,
        usedRecipes: usedRecipeIds.length,
        unusedRecipes: unusedRecipes.length,
      },
      topRecipes,
      unusedRecipes,
    };
  },

  /**
   * Báo cáo Expiry Tracking
   * @param {string} userId
   * @param {string} period - 'week' or 'month'
   * @returns {Promise<object>}
   */
  async getExpiryTracking(userId, period = 'week') {
    // Get user's group if exists
    const group = await Group.findOne({
      members: { $elemMatch: { userId, status: 'active' } },
    });
    const groupId = group?._id || null;

    const query = groupId ? { groupId } : { userId, groupId: null };

    const now = new Date();
    const daysAhead = period === 'week' ? 7 : 30;
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    // Get items expiring soon (in-stock only)
    const expiringSoon = await FridgeItem.find({
      ...query,
      status: 'in-stock',
      expiryDate: { $gt: now, $lte: futureDate },
    })
      .populate('foodId', 'name category')
      .populate('unitId', 'name abbreviation')
      .sort({ expiryDate: 1 });

    // Get expired items
    const expired = await FridgeItem.find({
      ...query,
      expiryDate: { $lt: now },
      status: { $in: ['in-stock', 'expired'] },
    })
      .populate('foodId', 'name category')
      .populate('unitId', 'name abbreviation')
      .sort({ expiryDate: 1 });

    // Get discarded/wasted items in the period
    const periodStart = new Date(now.getTime() - daysAhead * 24 * 60 * 60 * 1000);
    const wasted = await FridgeItem.find({
      ...query,
      status: { $in: ['expired', 'discarded'] },
      updatedAt: { $gte: periodStart },
    })
      .populate('foodId', 'name category')
      .populate('unitId', 'name abbreviation');

    // Calculate waste statistics
    const wasteValue = wasted.reduce((sum, item) => sum + (item.price || 0), 0);
    const wastePercentage =
      wasted.length > 0 && expiringSoon.length > 0
        ? Math.round((wasted.length / (wasted.length + expiringSoon.length)) * 100)
        : 0;

    return {
      expiringSoon: expiringSoon.map((item) => ({
        _id: item._id,
        food: item.foodId,
        quantity: item.quantity,
        unit: item.unitId,
        expiryDate: item.expiryDate,
        daysUntilExpiry: Math.ceil((item.expiryDate - now) / (1000 * 60 * 60 * 24)),
        price: item.price,
      })),
      expired: expired.map((item) => ({
        _id: item._id,
        food: item.foodId,
        quantity: item.quantity,
        unit: item.unitId,
        expiryDate: item.expiryDate,
        daysExpired: Math.ceil((now - item.expiryDate) / (1000 * 60 * 60 * 24)),
        price: item.price,
        status: item.status,
      })),
      wasteStats: {
        wastedItems: wasted.length,
        wasteValue: Math.round(wasteValue * 100) / 100,
        wastePercentage,
      },
    };
  },

  /**
   * Báo cáo Food Waste Analysis
   * @param {string} userId
   * @param {object} options
   * @returns {Promise<object>}
   */
  async getWasteAnalysis(userId, options) {
    const { startDate, endDate } = options;
    const query = {
      ...(groupId ? { groupId } : { userId, groupId: null }),
      status: { $in: ['expired', 'discarded'] },
    };
    if (startDate || endDate) {
      query.updatedAt = {};
      if (startDate) query.updatedAt.$gte = startOfLocalDay(startDate);
      if (endDate) query.updatedAt.$lte = endOfLocalDay(endDate);
    } else {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      query.updatedAt = { $gte: startOfLocalDay(threeMonthsAgo) };
    }

    const wastedItems = await FridgeItem.find(query)
      .populate('foodId', 'name category')
      .populate('unitId', 'name abbreviation')
      .sort({ updatedAt: -1 });

    // Calculate total waste value
    const totalWasteValue = wastedItems.reduce((sum, item) => sum + (item.price || 0), 0);

    // Top wasted foods
    const wasteByFood = {};
    wastedItems.forEach((item) => {
      const foodName = item.foodId?.name || 'Unknown';
      if (!wasteByFood[foodName]) {
        wasteByFood[foodName] = {
          name: foodName,
          count: 0,
          totalValue: 0,
          category: item.foodId?.category || 'Other',
        };
      }
      wasteByFood[foodName].count++;
      wasteByFood[foodName].totalValue += item.price || 0;
    });

    const topWastedFoods = Object.values(wasteByFood)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10)
      .map((item) => ({
        ...item,
        totalValue: Math.round(item.totalValue * 100) / 100,
      }));

    // Waste by reason
    const wasteByReason = {
      expired: wastedItems.filter((item) => item.status === 'expired').length,
      discarded: wastedItems.filter((item) => item.status === 'discarded').length,
    };

    // Waste trend by month
    const wasteTrendByMonth = {};
    wastedItems.forEach((item) => {
      const month = `${item.updatedAt.getFullYear()}-${String(
        item.updatedAt.getMonth() + 1
      ).padStart(2, '0')}`;
      if (!wasteTrendByMonth[month]) {
        wasteTrendByMonth[month] = { count: 0, value: 0 };
      }
      wasteTrendByMonth[month].count++;
      wasteTrendByMonth[month].value += item.price || 0;
    });

    const wasteTrend = Object.entries(wasteTrendByMonth)
      .map(([month, data]) => ({
        month,
        count: data.count,
        value: Math.round(data.value * 100) / 100,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      summary: {
        totalWastedItems: wastedItems.length,
        totalWasteValue: Math.round(totalWasteValue * 100) / 100,
      },
      topWastedFoods,
      wasteByReason,
      wasteTrend,
    };
  },
};

export default reportService;
