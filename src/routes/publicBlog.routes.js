import { Router } from "express";
import { BlogPost } from "../models/BlogPost.js";

const router = Router();

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// GET /api/blog/latest?limit=3
router.get("/latest", async (req, res) => {
  try {
    const limit = Math.min(Math.max(toInt(req.query.limit, 3), 1), 12);

    const posts = await BlogPost.find({ status: "published" })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ posts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch latest posts" });
  }
});

// GET /api/blog?page=1&limit=9
router.get("/", async (req, res) => {
  try {
    const page = Math.max(toInt(req.query.page, 1), 1);
    const limit = Math.min(Math.max(toInt(req.query.limit, 9), 1), 30);

    const filter = { status: "published" };

    const total = await BlogPost.countDocuments(filter);
    const posts = await BlogPost.find(filter)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const pages = total > 0 ? Math.ceil(total / limit) : 1;

    res.json({ posts, page, limit, total, pages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
});

// GET /api/blog/:slug
router.get("/:slug", async (req, res) => {
  try {
    const post = await BlogPost.findOne({
      slug: req.params.slug,
      status: "published",
    }).lean();

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json({ post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch post" });
  }
});

export default router;