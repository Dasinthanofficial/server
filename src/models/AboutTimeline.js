import mongoose from "mongoose";

const ImageSchema = new mongoose.Schema(
  {
    url: String,
    publicId: String,
    width: Number,
    height: Number,
  },
  { _id: false }
);

export const DEFAULT_ABOUT_TIMELINE_ITEMS = [];

const TimelineItemSchema = new mongoose.Schema(
  {
    year: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    sub: { type: String, default: "", trim: true },
    icon: { type: ImageSchema, default: null },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const AboutTimelineSchema = new mongoose.Schema(
  {
    key: { type: String, default: "aboutTimeline", unique: true, index: true },
    items: {
      type: [TimelineItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export const AboutTimeline = mongoose.model("AboutTimeline", AboutTimelineSchema);