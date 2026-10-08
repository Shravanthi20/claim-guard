import { Response, NextFunction } from "express";
import prisma from "../services/prisma";
import { AuthRequest } from "./authMiddleware";

export function requireRoles(...roles: string[]) {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user?.sub) {
        return res.status(401).json({
          message: "Authentication required",
        });
      }

      const user = await prisma.user.findUnique({
        where: {
          cognitoSub: req.user.sub,
        },
      });

      if (!user) {
        return res.status(403).json({
          message: "User is not registered in ClaimGuard",
        });
      }

      if (!roles.includes(user.role)) {
        return res.status(403).json({
          message: "Insufficient permissions",
        });
      }

      req.user.role = user.role;
      req.user.dbUserId = user.id;

      next();
    } catch (error) {
      console.error("Authorization error:", error);

      return res.status(500).json({
        message: "Authorization failed",
      });
    }
  };
}