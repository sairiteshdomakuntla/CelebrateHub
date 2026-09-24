import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import * as ctrl from "./reviews.controller.js";

const router = Router();

// Public: view provider's reviews and rating metrics
router.get("/provider/:providerId", ctrl.getProviderReviews);

// Authenticated: view review for a booking
router.get("/booking/:bookingId", authenticate, ctrl.getBookingReview);

// Authenticated: get my submitted reviews (customer)
router.get("/my", authenticate, ctrl.getMyReviews);

// Authenticated: get my received reviews (provider)
router.get("/received", authenticate, ctrl.getProviderReceivedReviews);

// Authenticated: submit new review
router.post("/", authenticate, ctrl.createReview);

// Authenticated: update review
router.patch("/:id", authenticate, ctrl.updateReview);

// Authenticated: delete review (author or admin)
router.delete("/:id", authenticate, ctrl.deleteReview);

export default router;
