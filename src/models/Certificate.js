import mongoose from "mongoose";

const CertificateSchema = new mongoose.Schema(
  {
    studentName: { type: String, required: true, trim: true },
    certificateId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
    },
    program: { type: String, required: true, trim: true },
    issuedDate: { type: Date, required: true },
    description: { type: String, default: "", trim: true },
    issuedBy: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export const Certificate = mongoose.model("Certificate", CertificateSchema);