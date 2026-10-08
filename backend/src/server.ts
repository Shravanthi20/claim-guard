import "dotenv/config";
import express from "express";
import cors from "cors";
import prisma from "./services/prisma";
import claimRoutes from "./routes/claimRoutes";
import evidenceRoutes from "./routes/evidenceRoutes";
import internalRoutes from "./routes/internalRoutes";
import { authenticate, AuthRequest } from "./middleware/authMiddleware";
import userRoutes from "./routes/userRoutes";

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/api/users", userRoutes);

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: "ok",
      service: "ClaimGuard API",
      database: "connected",
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      status: "error",
      service: "ClaimGuard API",
      database: "disconnected",
    });
  }
});

app.use("/api/claims", claimRoutes);
app.use("/api/evidence", evidenceRoutes);
app.use("/api/internal", internalRoutes);
app.get(
  "/api/auth/test",
  authenticate,
  (req: AuthRequest, res) => {
    res.json({
      message: "Authentication successful",
      cognitoSub: req.user?.sub,
      username: req.user?.username,
    });
  }
);

app.listen(PORT, () => {
  console.log(`ClaimGuard backend running on port ${PORT}`);
});