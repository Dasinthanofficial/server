import mongoose from "mongoose";

const HeroSlideSchema = new mongoose.Schema(
  {
    image: {
      url: String,
      publicId: String,
      width: Number,
      height: Number,
    },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

HeroSlideSchema.index({ order: 1 });

export const HeroSlide = mongoose.model("HeroSlide", HeroSlideSchema);