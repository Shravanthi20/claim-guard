import { Router } from "express";
import prisma from "../services/prisma";
import { authenticate, AuthRequest } from "../middleware/authMiddleware";
import { requireRoles } from "../middleware/authorize";

const router = Router();

router.get("/me", authenticate, async (req: AuthRequest, res) => {
  try {
    const cognitoSub = req.user!.sub;

    let user = await prisma.user.findUnique({
      where: {
        cognitoSub,
      },
    });

    // Create a database user if this is their first login
    if (!user) {
      user = await prisma.user.create({
        data: {
          cognitoSub,
          email:
            req.user!.username ||
            `${cognitoSub}@claimguard.local`,
          name:
            req.user!.username ||
            "ClaimGuard User",
          role: "CUSTOMER",
        },
      });
    }

    // Store database user information in the authenticated request
    req.user!.dbUserId = user.id;
    req.user!.role = user.role;

    res.json(user);
  } catch (error) {
    console.error("User sync error:", error);

    res.status(500).json({
      message: "Failed to sync user",
    });
  }
});

router.patch(
  "/role",
  authenticate,
  requireRoles("ADMIN"),
  async (req: AuthRequest, res) => {
    try {
      const email =
        typeof req.body.email === "string"
          ? req.body.email.trim().toLowerCase()
          : "";
      const role = req.body.role;

      if (!email || !["CUSTOMER", "INVESTIGATOR"].includes(role)) {
        return res.status(400).json({
          message:
            "A valid email and CUSTOMER or INVESTIGATOR role are required",
        });
      }

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { role },
      });

      return res.json(updatedUser);
    } catch (error) {
      console.error("Role update error:", error);

      return res.status(500).json({
        message: "Failed to update user role",
      });
    }
  }
);

export default router;