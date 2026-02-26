import { Router } from "express";
import { BlogPost } from "../models/BlogPost.js";

const router = Router();

// GET /api/blog/latest?limit=3
router.get("/latest", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "3", 10), 12);

  const posts = await BlogPost.find({ status: "published" })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({ posts });
});

// GET /api/blog?page=1&limit=9
router.get("/", async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "9", 10), 1), 30);

  const filter = { status: "published" };

  const total = await BlogPost.countDocuments(filter);
  const posts = await BlogPost.find(filter)
    .sort({ publishedAt: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.json({ posts, page, limit, total, pages: Math.ceil(total / limit) });
});

// GET /api/blog/:slug
router.get("/:slug", async (req, res) => {
  const post = await BlogPost.findOne({
    slug: req.params.slug,
    status: "published",
  }).lean();

  if (!post) return res.status(404).json({ message: "Post not found" });

  res.json({ post });
});

export default router;