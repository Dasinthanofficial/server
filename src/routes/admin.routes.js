import { Router } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";

import { authAdmin } from "../middleware/authAdmin.js";
import { BlogPost } from "../models/BlogPost.js";
import { HeroSlide } from "../models/HeroSlide.js";
import { Partner } from "../models/Partner.js";
import { AnnualReport } from "../models/AnnualReport.js";
import { Certificate } from "../models/Certificate.js";
import {
  HomeStats,
  DEFAULT_HOME_STATS_ITEMS,
} from "../models/HomeStats.js";
import {
  Leadership,
  DEFAULT_LEADERSHIP,
} from "../models/Leadership.js";
import {
  AboutTimeline,
  DEFAULT_ABOUT_TIMELINE_ITEMS,
} from "../models/AboutTimeline.js";
import { makeSlug } from "../utils/slug.js";

const router = Router();

function normalizeCertificateId(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizePostContent(body = {}) {
  const hasBlocks = Array.isArray(body?.contentBlocks);
  const hasMarkdown = typeof body?.content === "string";

  if (body?.contentType === "blocks" || (!("contentType" in body) && hasBlocks)) {
    return {
      contentType: "blocks",
      content: "",
      contentBlocks: hasBlocks ? body.contentBlocks : [],
    };
  }

  return {
    contentType: "markdown",
    content: hasMarkdown ? body.content : "",
    contentBlocks: [],
  };
}

function hasPostContentFields(body = {}) {
  return "contentType" in body || "content" in body || "contentBlocks" in body;
}

function normalizeHomeStatsItems(items) {
  if (!Array.isArray(items)) return null;

  const normalized = items.slice(0, 4).map((item) => ({
    value: String(item?.value || "").trim(),
    label: String(item?.label || "").trim(),
  }));

  if (normalized.length !== 4) return null;
  if (normalized.some((item) => !item.value || !item.label)) return null;

  return normalized;
}

function sortByOrder(items = []) {
  return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function normalizeLeadershipPayload(body) {
  const rawDirectors = Array.isArray(body?.directors) ? body.directors : null;
  const rawMembers = Array.isArray(body?.members) ? body.members : null;

  if (!rawDirectors || !rawMembers) return null;

  const directors = rawDirectors.map((item, index) => ({
    name: String(item?.name || "").trim(),
    role: String(item?.role || "").trim(),
    photo: item?.photo?.url
      ? {
          url: String(item.photo.url || "").trim(),
          publicId: String(item.photo.publicId || "").trim(),
          width: Number(item.photo.width) || undefined,
          height: Number(item.photo.height) || undefined,
        }
      : null,
    order: index,
  }));

  const members = rawMembers.map((item, index) => ({
    name: String(item?.name || "").trim(),
    role: String(item?.role || "Board Member").trim(),
    photo: item?.photo?.url
      ? {
          url: String(item.photo.url || "").trim(),
          publicId: String(item.photo.publicId || "").trim(),
          width: Number(item.photo.width) || undefined,
          height: Number(item.photo.height) || undefined,
        }
      : null,
    order: index,
  }));

  if (directors.length === 0) return null;
  if (directors.some((item) => !item.name || !item.role)) return null;
  if (members.some((item) => !item.name)) return null;

  return { directors, members };
}

function sortTimelineItems(items = []) {
  return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function normalizeTimelineItems(items) {
  if (!Array.isArray(items)) return null;

  const normalized = items.map((item, index) => ({
    year: String(item?.year || "").trim(),
    label: String(item?.label || "").trim(),
    sub: String(item?.sub || "").trim(),
    icon: item?.icon?.url
      ? {
          url: String(item.icon.url || "").trim(),
          publicId: String(item.icon.publicId || "").trim(),
          width: Number(item.icon.width) || undefined,
          height: Number(item.icon.height) || undefined,
        }
      : null,
    order: index,
  }));

  if (normalized.length === 0) return null;
  if (normalized.some((item) => !item.year || !item.label)) return null;

  return normalized;
}

async function getNextOrder(Model) {
  const last = await Model.findOne().sort({ order: -1 }).select("order").lean();
  return (last?.order ?? -1) + 1;
}

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

function removedPublicIds(oldIds = [], newIds = []) {
  const oldSet = new Set(oldIds.filter(Boolean));
  const newSet = new Set(newIds.filter(Boolean));
  return [...oldSet].filter((id) => !newSet.has(id));
}

async function destroyImagePublicIds(ids = []) {
  if (!ids.length) return;
  await Promise.allSettled(
    ids.map((publicId) =>
      cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
      })
    )
  );
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith("image/");
    const isPdf = file.mimetype === "application/pdf";

    if (!isImage && !isPdf) {
      return cb(new Error("Only images and PDFs are allowed"));
    }

    cb(null, true);
  },
});

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
});

router.post("/auth/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    if (email !== process.env.ADMIN_EMAIL) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const hash = process.env.ADMIN_PASSWORD_HASH;
    const plain = process.env.ADMIN_PASSWORD;

    let ok = false;

    if (hash) ok = await bcrypt.compare(password, hash);
    else if (plain) ok = password === plain;

    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ role: "admin", email }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
});

/* ================= BLOG POSTS ================= */

router.get("/posts", authAdmin, async (req, res) => {
  try {
    const posts = await BlogPost.find()
      .sort({ updatedAt: -1, createdAt: -1 })
      .select(
        "title slug excerpt category status publishedAt updatedAt createdAt coverImage"
      )
      .lean();

    res.json({ posts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
});

router.get("/posts/:id", authAdmin, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const post = await BlogPost.findById(req.params.id).lean();

    if (!post) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({ post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch post" });
  }
});

router.post("/posts", authAdmin, async (req, res) => {
  try {
    const { title, excerpt, category, tags, coverImage, status } = req.body || {};

    const normalizedContent = hasPostContentFields(req.body || {})
      ? normalizePostContent(req.body || {})
      : {
          contentType: "blocks",
          content: "",
          contentBlocks: [],
        };

    if (!title?.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    const baseSlug = makeSlug(title);
    if (!baseSlug) {
      return res
        .status(400)
        .json({ message: "Title must contain letters or numbers" });
    }

    let slug = baseSlug;
    let i = 1;

    while (await BlogPost.exists({ slug })) {
      slug = `${baseSlug}-${i++}`;
    }

    const doc = await BlogPost.create({
      title: title.trim(),
      slug,
      excerpt: excerpt || "",
      contentType: normalizedContent.contentType,
      content:
        normalizedContent.contentType === "markdown"
          ? normalizedContent.content
          : "",
      contentBlocks:
        normalizedContent.contentType === "blocks"
          ? normalizedContent.contentBlocks
          : [],
      category: category || "General",
      tags: Array.isArray(tags) ? tags : [],
      coverImage: coverImage || null,
      status: status === "published" ? "published" : "draft",
      publishedAt: status === "published" ? new Date() : null,
    });

    res.status(201).json({ post: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create post" });
  }
});

router.put("/posts/:id", authAdmin, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Not found" });

    const { title, excerpt, category, tags, coverImage, status } = req.body || {};

    if ("title" in (req.body || {})) {
      const trimmedTitle = String(title || "").trim();

      if (!trimmedTitle) {
        return res.status(400).json({ message: "Title is required" });
      }

      post.title = trimmedTitle;
    }

    post.excerpt = excerpt ?? post.excerpt;
    post.category = category ?? post.category;
    post.tags = Array.isArray(tags) ? tags : post.tags;

    if (hasPostContentFields(req.body || {})) {
      const normalizedContent = normalizePostContent(req.body || {});

      post.contentType = normalizedContent.contentType;
      post.content =
        normalizedContent.contentType === "markdown"
          ? normalizedContent.content
          : "";
      post.contentBlocks =
        normalizedContent.contentType === "blocks"
          ? normalizedContent.contentBlocks
          : [];
    }

    let oldCoverPublicIdToDelete = null;

    if ("coverImage" in (req.body || {})) {
      const oldPublicId = post.coverImage?.publicId;
      const newPublicId = coverImage?.publicId;

      if (oldPublicId && oldPublicId !== newPublicId) {
        oldCoverPublicIdToDelete = oldPublicId;
      }

      post.coverImage = coverImage || null;
    }

    if (status === "published" && post.status !== "published") {
      post.status = "published";
      post.publishedAt = new Date();
    } else if (status === "draft") {
      post.status = "draft";
      post.publishedAt = null;
    }

    await post.save();

    if (oldCoverPublicIdToDelete) {
      try {
        await cloudinary.uploader.destroy(oldCoverPublicIdToDelete, {
          resource_type: "image",
        });
      } catch {}
    }

    res.json({ post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update post" });
  }
});

router.delete("/posts/:id", authAdmin, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Not found" });

    if (post.coverImage?.publicId) {
      try {
        await cloudinary.uploader.destroy(post.coverImage.publicId, {
          resource_type: "image",
        });
      } catch {}
    }

    await post.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete post" });
  }
});

/* ================= FILE UPLOAD ================= */

router.post("/upload", authAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    const isImage = req.file.mimetype.startsWith("image/");
    const isPdf = req.file.mimetype === "application/pdf";

    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString(
      "base64"
    )}`;

    const result = await cloudinary.uploader.upload(base64, {
      folder: "nonprofit",
      resource_type: "image",
    });

    if (isPdf) {
      return res.json({
        file: {
          url: result.secure_url,
          publicId: result.public_id,
          pages: result.pages || 1,
        },
      });
    }

    if (isImage) {
      return res.json({
        image: {
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        },
      });
    }

    return res.status(400).json({ message: "Unsupported file type" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
});

/* ================= HERO ================= */

router.get("/hero", authAdmin, async (req, res) => {
  try {
    const slides = await HeroSlide.find().sort({ order: 1 }).lean();
    res.json({ slides });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch hero slides" });
  }
});

router.post("/hero", authAdmin, async (req, res) => {
  try {
    const { image } = req.body || {};

    if (!image?.url) {
      return res.status(400).json({ message: "Image required" });
    }

    const slide = await HeroSlide.create({
      image,
      order: await getNextOrder(HeroSlide),
    });

    res.status(201).json({ slide });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create hero slide" });
  }
});

router.delete("/hero/:id", authAdmin, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const slide = await HeroSlide.findById(req.params.id);
    if (!slide) return res.status(404).json({ message: "Not found" });

    if (slide.image?.publicId) {
      try {
        await cloudinary.uploader.destroy(slide.image.publicId, {
          resource_type: "image",
        });
      } catch {}
    }

    await slide.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete hero slide" });
  }
});

/* ================= HOME STATS ================= */

router.get("/home-stats", authAdmin, async (req, res) => {
  try {
    const doc = await HomeStats.findOne({ key: "home" }).lean();

    res.json({
      items: doc?.items?.length ? doc.items : DEFAULT_HOME_STATS_ITEMS,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch home stats" });
  }
});

router.put("/home-stats", authAdmin, async (req, res) => {
  try {
    const items = normalizeHomeStatsItems(req.body?.items);

    if (!items) {
      return res.status(400).json({
        message: "Exactly 4 valid stat items are required",
      });
    }

    const doc = await HomeStats.findOneAndUpdate(
      { key: "home" },
      { key: "home", items },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ items: doc.items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update home stats" });
  }
});

/* ================= LEADERSHIP ================= */

router.get("/leadership", authAdmin, async (req, res) => {
  try {
    const doc = await Leadership.findOne({ key: "aboutLeadership" }).lean();

    if (!doc) {
      return res.json({
        directors: DEFAULT_LEADERSHIP.directors,
        members: DEFAULT_LEADERSHIP.members,
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

router.put("/leadership", authAdmin, async (req, res) => {
  try {
    const payload = normalizeLeadershipPayload(req.body);

    if (!payload) {
      return res.status(400).json({
        message:
          "At least one valid director is required. Director role and all member names must be filled.",
      });
    }

    const existing = await Leadership.findOne({
      key: "aboutLeadership",
    }).lean();

    const oldIds = [
      ...(existing?.directors || []).map((item) => item.photo?.publicId),
      ...(existing?.members || []).map((item) => item.photo?.publicId),
    ];

    const newIds = [
      ...payload.directors.map((item) => item.photo?.publicId),
      ...payload.members.map((item) => item.photo?.publicId),
    ];

    const idsToDelete = removedPublicIds(oldIds, newIds);

    const doc = await Leadership.findOneAndUpdate(
      { key: "aboutLeadership" },
      { key: "aboutLeadership", ...payload },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    await destroyImagePublicIds(idsToDelete);

    res.json({
      directors: sortByOrder(doc.directors || []),
      members: sortByOrder(doc.members || []),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update leadership data" });
  }
});

/* ================= ABOUT TIMELINE ================= */

router.get("/timeline", authAdmin, async (req, res) => {
  try {
    const doc = await AboutTimeline.findOne({ key: "aboutTimeline" }).lean();

    res.json({
      items: doc?.items?.length
        ? sortTimelineItems(doc.items)
        : DEFAULT_ABOUT_TIMELINE_ITEMS,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch timeline data" });
  }
});

router.put("/timeline", authAdmin, async (req, res) => {
  try {
    const items = normalizeTimelineItems(req.body?.items);

    if (!items) {
      return res.status(400).json({
        message: "At least one valid timeline item is required",
      });
    }

    const existing = await AboutTimeline.findOne({
      key: "aboutTimeline",
    }).lean();

    const oldIds = (existing?.items || []).map((item) => item.icon?.publicId);
    const newIds = items.map((item) => item.icon?.publicId);
    const idsToDelete = removedPublicIds(oldIds, newIds);

    const doc = await AboutTimeline.findOneAndUpdate(
      { key: "aboutTimeline" },
      { key: "aboutTimeline", items },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    await destroyImagePublicIds(idsToDelete);

    res.json({
      items: sortTimelineItems(doc.items || []),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update timeline data" });
  }
});

/* ================= PARTNERS ================= */

router.get("/partners", authAdmin, async (req, res) => {
  try {
    const partners = await Partner.find().sort({ order: 1 }).lean();
    res.json({ partners });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch partners" });
  }
});

router.post("/partners", authAdmin, async (req, res) => {
  try {
    const { name, logo, website } = req.body || {};

    if (!name?.trim() || !logo?.url) {
      return res.status(400).json({ message: "Name and logo required" });
    }

    const partner = await Partner.create({
      name: name.trim(),
      logo,
      website: website || "",
      order: await getNextOrder(Partner),
    });

    res.status(201).json({ partner });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create partner" });
  }
});

router.delete("/partners/:id", authAdmin, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ message: "Not found" });

    if (partner.logo?.publicId) {
      try {
        await cloudinary.uploader.destroy(partner.logo.publicId, {
          resource_type: "image",
        });
      } catch {}
    }

    await partner.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete partner" });
  }
});

/* ================= REPORTS ================= */

router.get("/reports", authAdmin, async (req, res) => {
  try {
    const reports = await AnnualReport.find().sort({ order: 1 }).lean();
    res.json({ reports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
});

router.post("/reports", authAdmin, async (req, res) => {
  try {
    const { title, year, coverImage, pdfFile } = req.body || {};

    if (!title?.trim() || !year?.trim() || !coverImage?.url || !pdfFile?.url) {
      return res.status(400).json({
        message: "Title, year, cover image, and PDF are required",
      });
    }

    const report = await AnnualReport.create({
      title: title.trim(),
      year: year.trim(),
      coverImage,
      pdfFile,
      order: await getNextOrder(AnnualReport),
    });

    res.status(201).json({ report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create report" });
  }
});

router.delete("/reports/:id", authAdmin, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const report = await AnnualReport.findByIdAndDelete(req.params.id);

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    if (report.coverImage?.publicId) {
      try {
        await cloudinary.uploader.destroy(report.coverImage.publicId, {
          resource_type: "image",
          invalidate: true,
        });
      } catch (err) {
        console.error("Failed to delete cover image:", err);
      }
    }

    if (report.pdfFile?.publicId) {
      try {
        await cloudinary.uploader.destroy(report.pdfFile.publicId, {
          resource_type: "image",
          invalidate: true,
        });
      } catch (err) {
        console.error("Failed to delete PDF:", err);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete report" });
  }
});

/* ================= CERTIFICATES ================= */

router.get("/certificates", authAdmin, async (req, res) => {
  try {
    const certificates = await Certificate.find()
      .sort({ createdAt: -1 })
      .lean();

    res.json({ certificates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch certificates" });
  }
});

router.post("/certificates", authAdmin, async (req, res) => {
  try {
    const {
      studentName,
      certificateId,
      program,
      issuedDate,
      description,
      issuedBy,
    } = req.body || {};

    if (
      !studentName?.trim() ||
      !certificateId?.trim() ||
      !program?.trim() ||
      !issuedDate ||
      !issuedBy?.trim()
    ) {
      return res.status(400).json({
        message:
          "Student name, certificate ID, program, issued date, and issued by are required",
      });
    }

    const normalizedId = normalizeCertificateId(certificateId);
    const date = new Date(issuedDate);

    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({ message: "Invalid issued date" });
    }

    const exists = await Certificate.exists({ certificateId: normalizedId });
    if (exists) {
      return res.status(409).json({ message: "Certificate ID already exists" });
    }

    const certificate = await Certificate.create({
      studentName: studentName.trim(),
      certificateId: normalizedId,
      program: program.trim(),
      issuedDate: date,
      description: description?.trim() || "",
      issuedBy: issuedBy.trim(),
    });

    res.status(201).json({ certificate });
  } catch (err) {
    console.error(err);

    if (err?.code === 11000) {
      return res.status(409).json({ message: "Certificate ID already exists" });
    }

    res.status(500).json({ message: "Failed to create certificate" });
  }
});

router.delete("/certificates/:id", authAdmin, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) {
      return res.status(404).json({ message: "Not found" });
    }

    await certificate.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete certificate" });
  }
});

export default router;