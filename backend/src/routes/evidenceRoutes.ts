import { Router } from "express";
import multer from "multer";
import { authenticate } from "../middleware/authMiddleware";
import { requireRoles } from "../middleware/authorize";

import {
  getEvidenceDownloadUrl,
  uploadEvidence,
} from "../controllers/evidenceController";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const uploadMiddleware = upload.single("file");

router.use(authenticate, requireRoles("CUSTOMER", "INVESTIGATOR", "ADMIN"));
router.get("/:id/url", getEvidenceDownloadUrl);
router.post("/", uploadMiddleware, uploadEvidence);
router.post("/upload", uploadMiddleware, uploadEvidence);

export default router;
