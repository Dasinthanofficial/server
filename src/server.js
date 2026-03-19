import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { connectDB } from "./config/db.js";
import { initCloudinary } from "./config/cloudinary.js";

import publicBlogRoutes from "./routes/publicBlog.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import publicCertificateRoutes from "./routes/publicCertificate.routes.js";

import { HeroSlide } from "./models/HeroSlide.js";
import { Partner } from "./models/Partner.js";
import { AnnualReport } from "./models/AnnualReport.js";
import { HomeStats } from "./models/HomeStats.js";
import { Leadership } from "./models/Leadership.js";
import { AboutTimeline } from "./models/AboutTimeline.js";
import {
  AboutHistory,
  DEFAULT_ABOUT_HISTORY,
} from "./models/AboutHistory.js";
import { CoreValue } from "./models/CoreValue.js";
import { ProgramFocus } from "./models/ProgramFocus.js";

const app = express();

function sortByOrder(items = []) {
  return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function requireEnv(name) {
  if (!process.env[name]) {
    throw new Error(`Missing required env var: ${name}`);
  }
}

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

/* ================= PUBLIC HOME STATS ================= */
app.get("/api/home-stats", async (req, res) => {
  try {
    const doc = await HomeStats.findOne({ key: "home" }).lean();

    res.json({
      items: Array.isArray(doc?.items) ? doc.items : [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch home stats" });
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

app.get("/api/reports/:id", async (req, res) => {
  try {
    const report = await AnnualReport.findOne({
      _id: req.params.id,
      active: true,
    }).lean();

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    res.json({ report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch report" });
  }
});

/* ================= PUBLIC LEADERSHIP ================= */
app.get("/api/leadership", async (req, res) => {
  try {
    const doc = await Leadership.findOne({ key: "aboutLeadership" }).lean();

    if (!doc) {
      return res.json({
        directors: [],
        members: [],
      });
    }

    res.json({
      directors: sortByOrder(doc.directors || []),
      members: sortByOrder(doc.members || []),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch leadership data" });
  }
});

/* ================= PUBLIC ABOUT TIMELINE ================= */
app.get("/api/timeline", async (req, res) => {
  try {
    const doc = await AboutTimeline.findOne({ key: "aboutTimeline" }).lean();

    res.json({
      items: Array.isArray(doc?.items) ? sortByOrder(doc.items) : [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch timeline data" });
  }
});

/* ================= PUBLIC ABOUT HISTORY ================= */
app.get("/api/about-history", async (req, res) => {
  try {
    const doc = await AboutHistory.findOne({ key: "aboutHistory" }).lean();

    res.json({
      aboutHistory: doc
        ? {
            kicker: doc.kicker || DEFAULT_ABOUT_HISTORY.kicker,
            title: doc.title || DEFAULT_ABOUT_HISTORY.title,
            paragraph1: doc.paragraph1 || DEFAULT_ABOUT_HISTORY.paragraph1,
            paragraph2: doc.paragraph2 || DEFAULT_ABOUT_HISTORY.paragraph2,
            image: doc.image || null,
          }
        : DEFAULT_ABOUT_HISTORY,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch about history" });
  }
});

/* ================= PUBLIC CORE VALUES ================= */
app.get("/api/core-values", async (req, res) => {
  try {
    const values = await CoreValue.find({ active: true })
      .sort({ order: 1 })
      .lean();

    res.json({ values });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch core values" });
  }
});

/* ================= PUBLIC PROGRAM FOCUS ================= */
app.get("/api/program-focus", async (req, res) => {
  try {
    const items = await ProgramFocus.find({ active: true })
      .sort({ order: 1 })
      .lean();

    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch program focus items" });
  }
});

/* ================= OTHER ROUTES ================= */
app.use("/api/blog", publicBlogRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/certificates", publicCertificateRoutes);

/* ================= ERROR HANDLER (MUST BE LAST) ================= */
app.use((err, req, res, next) => {
  console.error(err);

  if (err?.name === "MulterError") {
    return res.status(400).json({ message: err.message });
  }

  if (err?.message === "Only images and PDFs are allowed") {
    return res.status(400).json({ message: err.message });
  }

  res.status(500).json({ message: "Server error" });
});

/* ================= START SERVER ================= */
const port = process.env.PORT || 8080;

async function start() {
  try {
    requireEnv("MONGO_URI");
    requireEnv("JWT_SECRET");
    requireEnv("ADMIN_EMAIL");

    if (!process.env.ADMIN_PASSWORD_HASH && !process.env.ADMIN_PASSWORD) {
      throw new Error("Missing ADMIN_PASSWORD_HASH or ADMIN_PASSWORD");
    }

    requireEnv("CLOUDINARY_CLOUD_NAME");
    requireEnv("CLOUDINARY_API_KEY");
    requireEnv("CLOUDINARY_API_SECRET");

    await connectDB(process.env.MONGO_URI);
    initCloudinary();

    app.listen(port, () => {
      console.log(`API running on :${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();