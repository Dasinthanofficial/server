import { Router } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";

import { authAdmin } from "../middleware/authAdmin.js";
import { BlogPost } from "../models/BlogPost.js";
import { makeSlug } from "../utils/slug.js";
import { v2 as cloudinary } from "cloudinary";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20
});

// POST /api/admin/auth/login
router.post("/auth/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: "Email and password required" });

  if (email !== process.env.ADMIN_EMAIL) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const hash = process.env.ADMIN_PASSWORD_HASH;
  const plain = process.env.ADMIN_PASSWORD;

  let ok = false;
  if (hash) ok = await bcrypt.compare(password, hash);
  else if (plain) ok = password === plain;

  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ role: "admin", email }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.json({ token });
});

// GET /api/admin/posts
router.get("/posts", authAdmin, async (req, res) => {
  const status = (req.query.status || "").trim(); // draft|published|""
  const filter = {};
  if (status) filter.status = status;

  const posts = await BlogPost.find(filter).sort({ updatedAt: -1 }).lean();
  res.json({ posts });
});

// POST /api/admin/posts
router.post("/posts", authAdmin, async (req, res) => {
  const { title, excerpt, content, category, tags, coverImage, status } = req.body || {};
  if (!title) return res.status(400).json({ message: "Title is required" });

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
    publishedAt: status === "published" ? new Date() : null
  });

  res.status(201).json({ post: doc });
});

// PUT /api/admin/posts/:id
router.put("/posts/:id", authAdmin, async (req, res) => {
  const { title, excerpt, content, category, tags, coverImage, status } = req.body || {};

  const post = await BlogPost.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Not found" });

  if (title && title !== post.title) {
    post.title = title;
    // slug remains stable by default; change if you want:
    // post.slug = makeSlug(title);
  }

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
});

// DELETE /api/admin/posts/:id
router.delete("/posts/:id", authAdmin, async (req, res) => {
  const post = await BlogPost.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Not found" });

  // optional: delete cloudinary cover image
  if (post.coverImage?.publicId) {
    try { await cloudinary.uploader.destroy(post.coverImage.publicId); } catch {}
  }

  await post.deleteOne();
  res.json({ ok: true });
});

// POST /api/admin/upload  (multipart/form-data: file)
router.post("/upload", authAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "file is required" });

  const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

  const result = await cloudinary.uploader.upload(base64, {
    folder: "nonprofit/blog",
    resource_type: "image"
  });

  res.json({
    image: {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height
    }
  });
});

export default router;