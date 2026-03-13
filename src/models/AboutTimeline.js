import mongoose from "mongoose";

export const DEFAULT_ABOUT_TIMELINE_ITEMS = [
  { year: "2008", label: "Founded", sub: "Kilinochchi", order: 0 },
  { year: "2020", label: "Education", sub: "Iyakkachchi", order: 1 },
  { year: "2024", label: "Parenting", sub: "WNAF", order: 2 },
  { year: "Next", label: "Expanding", sub: "New Areas", order: 3 },
];

const TimelineItemSchema = new mongoose.Schema(
  {
    year: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    sub: { type: String, default: "", trim: true },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const AboutTimelineSchema = new mongoose.Schema(
  {
    key: { type: String, default: "aboutTimeline", unique: true, index: true },
    items: {
      type: [TimelineItemSchema],
      default: () => DEFAULT_ABOUT_TIMELINE_ITEMS.map((item) => ({ ...item })),
    },
  },
  { timestamps: true }
);

export const AboutTimeline = mongoose.model("AboutTimeline", AboutTimelineSchema);