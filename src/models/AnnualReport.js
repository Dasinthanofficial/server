import mongoose from "mongoose";

const AnnualReportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true }, // e.g. Annual Report 2022–2023
    year: { type: String, required: true },  // e.g. 2022/2023

    coverImage: {
      url: String,
      publicId: String,
      width: Number,
      height: Number,
    },

    flipbookUrl: { type: String, required: true }, // Heyzine link
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AnnualReportSchema.index({ order: 1 });

export const AnnualReport = mongoose.model(
  "AnnualReport",
  AnnualReportSchema
);