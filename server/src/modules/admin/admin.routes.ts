import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth.middleware.js";
import {
  listUsers,
  updateUserStatus,
  deleteUser,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
  listReviews,
  updateReviewStatus,
  deleteReview,
  listIssues,
  createIssue,
  updateIssue,
  deleteIssue,
  getAdminStats,
  getAdminAnalytics,
  getPlatformSettings,
  updatePlatformSetting,
} from "./admin.controller.js";

const router = Router();

// All admin routes require ADMIN role
router.use(authenticate, requireRole("ADMIN"));

// Dashboard Stats & Analytics
router.get("/stats", getAdminStats);
router.get("/analytics", getAdminAnalytics);

// Platform Settings & Commission Configuration
router.get("/settings", getPlatformSettings);
router.patch("/settings/:key", updatePlatformSetting);

// User management
router.get("/users", listUsers);
router.patch("/users/:id/status", updateUserStatus);
router.delete("/users/:id", deleteUser);

// Category & Event Type management
router.get("/categories", listCategories);
router.post("/categories", createCategory);
router.patch("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

// Subscription Plans management
router.get("/plans", listPlans);
router.post("/plans", createPlan);
router.patch("/plans/:id", updatePlan);
router.delete("/plans/:id", deletePlan);

// Review Moderation
router.get("/reviews", listReviews);
router.patch("/reviews/:id/status", updateReviewStatus);
router.delete("/reviews/:id", deleteReview);

// Platform Issues & Disputes
router.get("/issues", listIssues);
router.post("/issues", createIssue);
router.patch("/issues/:id", updateIssue);
router.delete("/issues/:id", deleteIssue);

export default router;
