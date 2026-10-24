
import { Router } from "express";
import multer from "multer";

import {
  uploadPricing,
  getPricing,
  getPricingById,
  updatePricing,
} from "../controllers/pricingController.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB for this initial version
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    if (!file.originalname.toLowerCase().endsWith(".csv")) {
      return callback(new Error("Only CSV files are allowed."));
    }

    callback(null, true);
  },
});

router.post("/upload", upload.single("file"), uploadPricing);
router.get("/", getPricing);
router.get("/:id", getPricingById);
router.put("/:id", updatePricing);

export default router;
