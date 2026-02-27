import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { connectDB } from "./config/db.js";
import { initCloudinary } from "./config/cloudinary.js";

import publicBlogRoutes from "./routes/publicBlog.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { HeroSlide } from "./models/HeroSlide.js";

import { Partner } from "./models/Partner.js";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: false
  })
);

app.get("/api/health", (req, res) => res.json({ ok: true }));

// ✅ PUBLIC HERO ENDPOINT (MUST BE HERE)
app.get("/api/hero", async (req, res) => {
  const slides = await HeroSlide.find({ active: true })
    .sort({ order: 1 })
    .lean();

  res.json({ slides });
});

app.use("/api/blog", publicBlogRoutes);
app.use("/api/admin", adminRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

app.get("/api/partners", async (req, res) => {
  const partners = await Partner.find({ active: true })
    .sort({ order: 1 })
    .lean();

  res.json({ partners });
});

const port = process.env.PORT || 8080;

await connectDB(process.env.MONGO_URI);
initCloudinary();

app.listen(port, () => console.log(`API running on :${port}`));