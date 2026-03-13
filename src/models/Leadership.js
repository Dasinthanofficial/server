import mongoose from "mongoose";

export const DEFAULT_LEADERSHIP = {
  directors: [
    { name: "Mr. N. Paraneeswaran", role: "Chairman / Director", order: 0 },
    { name: "Mr. R. Ramiro", role: "Secretary", order: 1 },
    {
      name: "Pas M. Neethiraja Titus",
      role: "Treasurer / Accountant",
      order: 2,
    },
  ],
  members: [
    { name: "Pas R. Nagatheepan", order: 0 },
    { name: "Mr. Nagaraj", order: 1 },
    { name: "Pas. Delon Ratna", order: 2 },
    { name: "Mr. Sivor Jeyanth", order: 3 },
  ],
};

const DirectorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const MemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const LeadershipSchema = new mongoose.Schema(
  {
    key: { type: String, default: "aboutLeadership", unique: true, index: true },
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