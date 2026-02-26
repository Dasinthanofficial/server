import mongoose from "mongoose";

const CoverSchema = new mongoose.Schema(
  {
    url: String,
    publicId: String,
    width: Number,
    height: Number
  },
  { _id: false }
);

const BlogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    excerpt: { type: String, trim: true, default: "" },
    content: { type: String, default: "" }, // markdown
    category: { type: String, default: "General" },
    tags: { type: [String], default: [] },

    coverImage: { type: CoverSchema, default: null },

    status: { type: String, enum: ["draft", "published"], default: "draft" },
    publishedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const BlogPost = mongoose.model("BlogPost", BlogPostSchema);