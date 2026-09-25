import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import eventsRoutes from "./modules/events/events.routes.js";
import providersRoutes from "./modules/providers/providers.routes.js";
import leadsRoutes from "./modules/leads/leads.routes.js";
import subscriptionsRoutes from "./modules/subscriptions/subscriptions.routes.js";
import guestsRoutes from "./modules/guests/guests.routes.js";
import reviewsRoutes from "./modules/reviews/reviews.routes.js";
import notificationsRoutes from "./modules/notifications/notifications.routes.js";
import giftsRoutes from "./modules/gifts/gifts.routes.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

// ─── Routes ────────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.status(200).json({ success: true, message: "CelebrateHub API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/providers", providersRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/guests", guestsRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/gifts", giftsRoutes);

// ─── 404 ────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

export default app;