import { Router } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

import { authAdmin } from "../middleware/authAdmin.js";
import { BlogPost } from "../models/BlogPost.js";
import { HeroSlide } from "../models/HeroSlide.js";
import { makeSlug } from "../utils/slug.js";

const router = Router();

/* ================= MULTER CONFIG ================= */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // ✅ 5MB limit
});

/* ================= LOGIN RATE LIMIT ================= */
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
});

/* ================= ADMIN LOGIN ================= */
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

    const token = jwt.sign(
      { role: "admin", email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
});

/* ================= BLOG POSTS ================= */

router.get("/posts", authAdmin, async (req, res) => {
  try {
    const status = (req.query.status || "").trim();
    const filter = status ? { status } : {};

    const posts = await BlogPost.find(filter)
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ posts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
});

router.post("/posts", authAdmin, async (req, res) => {
  try {
    const { title, excerpt, content, category, tags, coverImage, status } =
      req.body || {};

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const baseSlug = makeSlug(title);
    let slug = baseSlug;
    let i = 1;

    while (await BlogPost.exists({ slug })) {
      slug = `${baseSlug}-${i++}`;
    }

    const doc = await BlogPost.create({
      title,
      slug,
      excerpt: excerpt || "",
      content: content || "",
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
    const post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Not found" });

    const { title, excerpt, content, category, tags, coverImage, status } =
      req.body || {};

    if (title) post.title = title;
    post.excerpt = excerpt ?? post.excerpt;
    post.content = content ?? post.content;
    post.category = category ?? post.category;
    post.tags = Array.isArray(tags) ? tags : post.tags;
    post.coverImage = coverImage ?? post.coverImage;

    if (status === "published" && post.status !== "published") {
      post.status = "published";
      post.publishedAt = new Date();
    } else if (status === "draft") {
      post.status = "draft";
      post.publishedAt = null;
    }

    await post.save();
    res.json({ post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update post" });
  }
});

router.delete("/posts/:id", authAdmin, async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Not found" });

    if (post.coverImage?.publicId) {
      try {
        await cloudinary.uploader.destroy(post.coverImage.publicId);
      } catch {}
    }

    await post.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete post" });
  }
});

/* ================= IMAGE UPLOAD ================= */

router.post("/upload", authAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "File is required" });

    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString(
      "base64"
    )}`;

    const result = await cloudinary.uploader.upload(base64, {
      folder: "nonprofit",
      resource_type: "image",
    });

    res.json({
      image: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
});

/* ================= HERO SLIDES ================= */

router.get("/hero", authAdmin, async (req, res) => {
  try {
    const slides = await HeroSlide.find()
      .sort({ order: 1 })
      .lean();

    res.json({ slides });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch hero slides" });
  }
});

router.post("/hero", authAdmin, async (req, res) => {
  try {
    const { image } = req.body;

    if (!image?.url)
      return res.status(400).json({ message: "Image required" });

    const count = await HeroSlide.countDocuments();

    const slide = await HeroSlide.create({
      image,
      order: count,
    });

    res.status(201).json({ slide });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create hero slide" });
  }
});

router.delete("/hero/:id", authAdmin, async (req, res) => {
  try {
    const slide = await HeroSlide.findById(req.params.id);
    if (!slide) return res.status(404).json({ message: "Not found" });

    if (slide.image?.publicId) {
      try {
        await cloudinary.uploader.destroy(slide.image.publicId);
      } catch {}
    }

    await slide.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete hero slide" });
  }
});

export default router;