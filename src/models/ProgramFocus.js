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

const ProgramFocusSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: ImageSchema,
      default: null,
    },
    order: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

ProgramFocusSchema.index({ order: 1 });

export const ProgramFocus = mongoose.model("ProgramFocus", ProgramFocusSchema);