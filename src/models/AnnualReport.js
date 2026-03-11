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

const PdfFileSchema = new mongoose.Schema(
  {
    url: String,
    publicId: String,
    pages: Number,
  },
  { _id: false }
);

const AnnualReportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    year: { type: String, required: true, trim: true },
    coverImage: { type: ImageSchema, default: null },
    pdfFile: { type: PdfFileSchema, default: null },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AnnualReportSchema.index({ order: 1 });

export const AnnualReport = mongoose.model("AnnualReport", AnnualReportSchema);