import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware";
import { requireRoles } from "../middleware/authorize";

import {
  createClaim,
  getClaims,
  getClaimById,
  updateClaimStatus,
  addInvestigationNote,
} from "../controllers/claimController";

const router = Router();

router.use(authenticate);
router.post("/", requireRoles("CUSTOMER"), createClaim);
router.get("/", requireRoles("CUSTOMER", "INVESTIGATOR", "ADMIN"), getClaims);
router.get("/:id", requireRoles("CUSTOMER", "INVESTIGATOR", "ADMIN"), getClaimById);
router.patch(
  "/:id/status",
  requireRoles("INVESTIGATOR", "ADMIN"),
  updateClaimStatus
);
router.post(
  "/:id/investigation-notes",
  requireRoles("INVESTIGATOR", "ADMIN"),
  addInvestigationNote
);

export default router;