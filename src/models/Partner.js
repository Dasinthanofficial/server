import mongoose from "mongoose";

const PartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    logo: {
      url: String,
      publicId: String,
      width: Number,
      height: Number,
    },

    website: { type: String, default: "" },

    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PartnerSchema.index({ order: 1 });

export const Partner = mongoose.model("Partner", PartnerSchema);