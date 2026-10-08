import { Router, Request, Response } from "express";
import prisma from "../services/prisma";

const router = Router();

router.post("/test-user", async (_req: Request, res: Response) => {
  try {
    const user = await prisma.user.create({
      data: {
        name: "Test Customer",
        email: `test-${Date.now()}@claimguard.com`,
        role: "CUSTOMER",
      },
    });

    return res.status(201).json({
      message: "Test user created",
      user,
    });
  } catch (error) {
    console.error("Create test user error:", error);

    return res.status(500).json({
      message: "Failed to create test user",
    });
  }
});

router.post("/ai-result", async (req: Request, res: Response) => {
  try {
    const {
      claimId,
      fraudProbability,
      riskScore,
      riskLevel,
      imageAnalysisResults,
    } = req.body;

    if (
      !claimId ||
      fraudProbability === undefined ||
      riskScore === undefined ||
      !riskLevel
    ) {
      return res.status(400).json({
        message:
          "claimId, fraudProbability, riskScore and riskLevel are required",
      });
    }

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
    });

    if (!claim) {
      return res.status(404).json({
        message: "Claim not found",
      });
    }

    const riskAssessment = await prisma.riskAssessment.upsert({
      where: {
        claimId,
      },
      create: {
        claimId,
        fraudProbability: Number(fraudProbability),
        riskScore: Number(riskScore),
        riskLevel,
        modelVersion: "xgboost-v1",
        riskFactors: {
          imageAnalysisResults: imageAnalysisResults || [],
        },
        aiProcessingStatus: "COMPLETED",
      },
      update: {
        fraudProbability: Number(fraudProbability),
        riskScore: Number(riskScore),
        riskLevel,
        modelVersion: "xgboost-v1",
        riskFactors: {
          imageAnalysisResults: imageAnalysisResults || [],
        },
        aiProcessingStatus: "COMPLETED",
      },
    });

    return res.status(200).json({
      message: "AI result saved successfully",
      riskAssessment,
    });
  } catch (error) {
    console.error("Save AI result error:", error);

    return res.status(500).json({
      message: "Failed to save AI result",
    });
  }
});

export default router;