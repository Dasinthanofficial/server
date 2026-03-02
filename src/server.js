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
import { AnnualReport } from "./models/AnnualReport.js";

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: false,
  })
);

/* ================= HEALTH ================= */
app.get("/api/health", (req, res) => res.json({ ok: true }));

/* ================= PUBLIC HERO ================= */
app.get("/api/hero", async (req, res) => {
  try {
    const slides = await HeroSlide.find({ active: true })
      .sort({ order: 1 })
      .lean();

    res.json({ slides });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch hero slides" });
  }
});

/* ================= PUBLIC PARTNERS ================= */
app.get("/api/partners", async (req, res) => {
  try {
    const partners = await Partner.find({ active: true })
      .sort({ order: 1 })
      .lean();

    res.json({ partners });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch partners" });
  }
});

/* ================= PUBLIC REPORTS ================= */
app.get("/api/reports", async (req, res) => {
  try {
    const reports = await AnnualReport.find({ active: true })
      .sort({ order: 1 })
      .lean();

    res.json({ reports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
});

/* ================= OTHER ROUTES ================= */
app.use("/api/blog", publicBlogRoutes);
app.use("/api/admin", adminRoutes);

/* ================= ERROR HANDLER (MUST BE LAST) ================= */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

/* ================= START SERVER ================= */
const port = process.env.PORT || 8080;

await connectDB(process.env.MONGO_URI);
initCloudinary();

app.listen(port, () => console.log(`API running on :${port}`));