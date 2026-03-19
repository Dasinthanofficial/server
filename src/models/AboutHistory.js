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

export const DEFAULT_ABOUT_HISTORY = {
  kicker: "Our History",
  title: "From Humble Beginnings",
  paragraph1:
    "Established in 2008, our journey began with a vision to rebuild lives and restore hope in Kilinochchi. Over the years, we expanded our reach, establishing the Education program in Iyakkachchi in 2020 to serve the growing needs of the community.",
  paragraph2:
    "Today, we continue to grow, believing that every individual possesses the potential to transform their world when given the right tools, support, and opportunities.",
  image: null,
};

const AboutHistorySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "aboutHistory",
      unique: true,
      index: true,
    },
    kicker: {
      type: String,
      default: DEFAULT_ABOUT_HISTORY.kicker,
      trim: true,
    },
    title: {
      type: String,
      default: DEFAULT_ABOUT_HISTORY.title,
      trim: true,
    },
    paragraph1: {
      type: String,
      default: DEFAULT_ABOUT_HISTORY.paragraph1,
      trim: true,
    },
    paragraph2: {
      type: String,
      default: DEFAULT_ABOUT_HISTORY.paragraph2,
      trim: true,
    },
    image: {
      type: ImageSchema,
      default: null,
    },
  },
  { timestamps: true }
);

export const AboutHistory = mongoose.model("AboutHistory", AboutHistorySchema);