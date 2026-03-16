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

export const DEFAULT_LEADERSHIP = {
  directors: [
    {
      name: "Mr. N. Paraneeswaran",
      role: "Chairman / Director",
      photo: null,
      facebook: "",
      whatsapp: "",
      order: 0,
    },
    {
      name: "Mr. R. Ramiro",
      role: "Secretary",
      photo: null,
      facebook: "",
      whatsapp: "",
      order: 1,
    },
    {
      name: "Pas M. Neethiraja Titus",
      role: "Treasurer / Accountant",
      photo: null,
      facebook: "",
      whatsapp: "",
      order: 2,
    },
  ],
  members: [
    {
      name: "Pas R. Nagatheepan",
      role: "Board Member",
      photo: null,
      facebook: "",
      whatsapp: "",
      order: 0,
    },
    {
      name: "Mr. Nagaraj",
      role: "Board Member",
      photo: null,
      facebook: "",
      whatsapp: "",
      order: 1,
    },
    {
      name: "Pas. Delon Ratna",
      role: "Board Member",
      photo: null,
      facebook: "",
      whatsapp: "",
      order: 2,
    },
    {
      name: "Mr. Sivor Jeyanth",
      role: "Board Member",
      photo: null,
      facebook: "",
      whatsapp: "",
      order: 3,
    },
  ],
};

const DirectorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    photo: { type: ImageSchema, default: null },
    facebook: { type: String, default: "", trim: true },
    whatsapp: { type: String, default: "", trim: true },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const MemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, default: "Board Member", trim: true },
    photo: { type: ImageSchema, default: null },
    facebook: { type: String, default: "", trim: true },
    whatsapp: { type: String, default: "", trim: true },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const LeadershipSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "aboutLeadership",
      unique: true,
      index: true,
    },
    directors: {
      type: [DirectorSchema],
      default: () => DEFAULT_LEADERSHIP.directors.map((item) => ({ ...item })),
    },
    members: {
      type: [MemberSchema],
      default: () => DEFAULT_LEADERSHIP.members.map((item) => ({ ...item })),
    },
  },
  { timestamps: true }
);

export const Leadership = mongoose.model("Leadership", LeadershipSchema);