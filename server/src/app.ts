import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";

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

// ─── 404 ────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

export default app;