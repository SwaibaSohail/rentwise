import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { uploadImage } from "../lib/cloudinary";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploadsRouter = Router();
uploadsRouter.use(requireAuth);

uploadsRouter.post(
  "/",
  requireRole("LANDLORD"),
  upload.single("image"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ error: "validation_error", message: "No image file" });
      }
      const url = await uploadImage(req.file.buffer);
      res.status(201).json({ url });
    } catch (err) {
      next(err);
    }
  }
);
