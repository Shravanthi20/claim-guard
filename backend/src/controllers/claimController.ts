import { Request, Response } from "express";
import prisma from "../services/prisma";
import { AuthRequest } from "../middleware/authMiddleware";

type ClaimIdParams = {
  id: string;
};

export const createClaim = async (req: AuthRequest, res: Response) => {
  try {
    const {
      policyId,
      title,
      description,
      claimedAmount,
    } = req.body;
    const userId = req.user?.dbUserId;

    if (!userId || !title || !description || claimedAmount === undefined) {
      return res.status(400).json({
        message: "title, description and claimedAmount are required",
      });
    }

    if (policyId) {
      const policy = await prisma.policy.findFirst({
        where: { id: policyId, userId },
      });

      if (!policy) {
        return res.status(400).json({
          message: "The selected policy does not belong to the authenticated user",
        });
      }
    }

    const claimNumber = `CLM-${Date.now()}`;

    const claim = await prisma.claim.create({
      data: {
        claimNumber,
        title,
        description,
        claimedAmount: Number(claimedAmount),
        userId,
        policyId: policyId || null,
        events: {
          create: {
            eventType: "CLAIM_SUBMITTED",
            description: "Claim submitted by customer",
          },
        },
      },
      include: {
        events: true,
        policy: true,
      },
    });

    return res.status(201).json(claim);
  } catch (error) {
    console.error("Create claim error:", error);

    return res.status(500).json({
      message: "Failed to create claim",
    });
  }
};

export const getClaims = async (req: AuthRequest, res: Response) => {
  try {
    const where =
      req.user?.role === "CUSTOMER"
        ? { userId: req.user.dbUserId }
        : undefined;

    const claims = await prisma.claim.findMany({
      where,
      include: {
        policy: true,
        user: true,
        riskAssessment: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(claims);
  } catch (error) {
    console.error("Get claims error:", error);

    return res.status(500).json({
      message: "Failed to fetch claims",
    });
  }
};

export const getClaimById = async (
  req: AuthRequest<ClaimIdParams>,
  res: Response
) => {
  try {
    const { id } = req.params;

    const claim = await prisma.claim.findUnique({
      where: {
        id,
      },
      include: {
        user: true,
        policy: true,
        evidence: true,
        investigation: {
          include: {
            notes: {
              orderBy: {
                createdAt: "desc",
              },
              include: {
                investigator: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
        riskAssessment: true,
        events: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!claim) {
      return res.status(404).json({
        message: "Claim not found",
      });
    }

    if (req.user?.role === "CUSTOMER" && claim.userId !== req.user.dbUserId) {
      return res.status(403).json({
        message: "You do not have access to this claim",
      });
    }

    return res.json(claim);
  } catch (error) {
    console.error("Get claim error:", error);

    return res.status(500).json({
      message: "Failed to fetch claim",
    });
  }
};

export const updateClaimStatus = async (
  req: AuthRequest<ClaimIdParams>,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "SUBMITTED",
      "UNDER_REVIEW",
      "ADDITIONAL_INFO_REQUIRED",
      "APPROVED",
      "REJECTED",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid claim status",
      });
    }

    const existingClaim = await prisma.claim.findUnique({
      where: { id },
    });

    if (!existingClaim) {
      return res.status(404).json({
        message: "Claim not found",
      });
    }

    const claim = await prisma.claim.update({
      where: { id },
      data: {
        status,
        events: {
          create: {
            eventType: "STATUS_CHANGED",
            description: `Claim status changed from ${existingClaim.status} to ${status}`,
          },
        },
      },
      include: {
        events: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    return res.json(claim);
  } catch (error) {
    console.error("Update claim status error:", error);

    return res.status(500).json({
      message: "Failed to update claim status",
    });
  }
};

export const addInvestigationNote = async (
  req: AuthRequest<ClaimIdParams>,
  res: Response
) => {
  try {
    const { id } = req.params;
    const content =
      typeof req.body.content === "string" ? req.body.content.trim() : "";
    const investigatorId = req.user?.dbUserId;

    if (!investigatorId || !content) {
      return res.status(400).json({
        message: "Investigation note content is required",
      });
    }

    const claim = await prisma.claim.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!claim) {
      return res.status(404).json({ message: "Claim not found" });
    }

    const investigation = await prisma.investigation.upsert({
      where: { claimId: id },
      create: {
        claimId: id,
        investigatorId,
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
      update: {
        investigatorId,
        status: "IN_PROGRESS",
        startedAt: undefined,
      },
    });

    const note = await prisma.investigationNote.create({
      data: {
        content,
        investigationId: investigation.id,
        investigatorId,
      },
      include: {
        investigator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return res.status(201).json(note);
  } catch (error) {
    console.error("Add investigation note error:", error);
    return res.status(500).json({
      message: "Failed to add investigation note",
    });
  }
};
