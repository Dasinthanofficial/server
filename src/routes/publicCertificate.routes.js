import { Router } from "express";
import { Certificate } from "../models/Certificate.js";

const router = Router();

router.get("/verify/:certificateId", async (req, res) => {
  try {
    const certificateId = String(req.params.certificateId || "")
      .trim()
      .toUpperCase();

    if (!certificateId) {
      return res.status(400).json({ message: "Certificate ID is required" });
    }

    const certificate = await Certificate.findOne({ certificateId }).lean();

    if (!certificate) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    res.json({ certificate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to verify certificate" });
  }
});

export default router;