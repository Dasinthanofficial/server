import mongoose from "mongoose";

export const DEFAULT_HOME_STATS_ITEMS = [
  { value: "16+", label: "Years Active" },
  { value: "2k+", label: "Families Helped" },
  { value: "500+", label: "Children Educated" },
  { value: "05", label: "Active Programs" },
];

const StatItemSchema = new mongoose.Schema(
  {
    value: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const HomeStatsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "home", unique: true, index: true },
    items: {
      type: [StatItemSchema],
      default: () => DEFAULT_HOME_STATS_ITEMS.map((item) => ({ ...item })),
    },
  },
  { timestamps: true }
);

export const HomeStats = mongoose.model("HomeStats", HomeStatsSchema);