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

export const DEFAULT_ABOUT_TIMELINE_ITEMS = [
  {
    year: "2008",
    label: "Founded",
    sub: "Kilinochchi",
    icon: null,
    order: 0,
  },
  {
    year: "2020",
    label: "Education",
    sub: "Iyakkachchi",
    icon: null,
    order: 1,
  },
  {
    year: "2024",
    label: "Parenting",
    sub: "WNAF",
    icon: null,
    order: 2,
  },
  {
    year: "Next",
    label: "Expanding",
    sub: "New Areas",
    icon: null,
    order: 3,
  },
];

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
      default: () => DEFAULT_ABOUT_TIMELINE_ITEMS.map((item) => ({ ...item })),
    },
  },
  { timestamps: true }
);

export const AboutTimeline = mongoose.model("AboutTimeline", AboutTimelineSchema);