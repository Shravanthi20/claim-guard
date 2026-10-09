import { Response } from "express";
import prisma from "../services/prisma";
import { createEvidenceDownloadUrl, uploadToS3 } from "../services/s3";
import { publishEvidenceUploadedEvent } from "../services/eventBridge";
import { AuthRequest } from "../middleware/authMiddleware";

export const uploadEvidence = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { claimId, description } = req.body;
    const file = req.file;

    if (!claimId || !file) {
      return res.status(400).json({
        message: "claimId and file are required",
      });
    }

    // Get claim + policy + customer's previous claims
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        policy: true,
        evidence: true,
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

    // 1. Upload evidence to S3
    const key = `claims/${claimId}/evidence/${Date.now()}-${file.originalname}`;

    await uploadToS3(
      file.buffer,
      key,
      file.mimetype
    );

    // 2. Save evidence metadata
    const evidence = await prisma.evidence.create({
      data: {
        claimId,
        fileName: file.originalname,
        fileType: file.mimetype,
        s3Key: key,
        description: description || null,
      },
    });

    // 3. Calculate ML features

    const now = new Date();

    const claimAgeDays = Math.max(
      1,
      Math.floor(
        (now.getTime() - claim.createdAt.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    const previousClaims = await prisma.claim.count({
      where: {
        userId: claim.userId,
        id: {
          not: claim.id,
        },
      },
    });

    const policyAgeDays = claim.policy
      ? Math.max(
          1,
          Math.floor(
            (now.getTime() - claim.policy.startDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 365;

    const evidenceCount = claim.evidence.length + 1;

    // 4. Publish enriched EventBridge event (non-fatal: the evidence is already
    // stored in S3 and the DB, so a publish failure should not fail the upload)
    try {
      await publishEvidenceUploadedEvent(
        claimId,
        evidence.id,
        key,
        file.mimetype,
        {
          claimAmount: claim.claimedAmount,
          claimAgeDays,
          previousClaims,
          policyAgeDays,
          evidenceCount,
        }
      );
    } catch (publishError) {
      console.error("EventBridge publish error (AI analysis not triggered):", publishError);
    }

    // 5. Record event in database
    await prisma.claimEvent.create({
      data: {
        claimId,
        eventType: "EVIDENCE_UPLOADED",
        description: `Evidence uploaded: ${file.originalname}`,
        metadata: {
          evidenceId: evidence.id,
          s3Key: key,
          fileType: file.mimetype,
        },
      },
    });

    return res.status(201).json({
      message: "Evidence uploaded successfully",
      evidence,
    });

  } catch (error) {
    console.error("Evidence upload error:", error);

    return res.status(500).json({
      message: "Failed to upload evidence",
      error:
        process.env.NODE_ENV === "production"
          ? undefined
          : error instanceof Error
            ? error.message
            : "Unknown error",
    });
  }
};

export const getEvidenceDownloadUrl = async (
  req: AuthRequest<{ id: string }>,
  res: Response
) => {
  try {
    const evidence = await prisma.evidence.findUnique({
      where: { id: req.params.id },
      include: { claim: true },
    });

    if (!evidence?.s3Key) {
      return res.status(404).json({ message: "Evidence not found" });
    }

    if (
      req.user?.role === "CUSTOMER" &&
      evidence.claim.userId !== req.user.dbUserId
    ) {
      return res.status(403).json({ message: "You do not have access to this evidence" });
    }

    const url = await createEvidenceDownloadUrl(evidence.s3Key);
    return res.json({ url, expiresIn: 900 });
  } catch (error) {
    console.error("Evidence download URL error:", error);
    return res.status(500).json({ message: "Failed to create evidence download URL" });
  }
};