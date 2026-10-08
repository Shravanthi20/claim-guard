import pg from "pg";
import { combineAssessment, loadScoringConfig } from "./scoring.mjs";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const getModelResult = (event) => event.modelResult || event;
const getFeatures = (event) =>
  event.mlFeatures || {
    claimAmount: event.claimAmount,
    claimAgeDays: event.claimAgeDays,
    previousClaims: event.previousClaims,
    policyAgeDays: event.policyAgeDays,
    evidenceCount: event.evidenceCount,
  };

export const handler = async (event) => {
  console.log("Result Writer input:", JSON.stringify(event));

  const claimId = event.claimId;
  const modelResult = getModelResult(event);
  const imageAnalysisResults =
    event.imageAnalysisResults ?? modelResult.imageAnalysisResults;
  const mlFeatures = getFeatures(event);
  const config = loadScoringConfig();

  if (!claimId || typeof claimId !== "string") {
    throw new Error("claimId is required");
  }

  const assessment = combineAssessment({
    modelResult,
    imageAnalysisResults,
    mlFeatures,
    config,
  });
  const client = await pool.connect();

  try {
    const claimResult = await client.query(
      `SELECT id FROM "Claim" WHERE id = $1`,
      [claimId]
    );
    if (claimResult.rowCount === 0) {
      throw new Error(`Claim not found: ${claimId}`);
    }

    await client.query(
      `
      INSERT INTO "RiskAssessment"
        ("id", "riskLevel", "riskScore", "fraudProbability",
         "modelVersion", "riskFactors", "aiProcessingStatus",
         "createdAt", "updatedAt", "claimId")
      VALUES
        (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW(), $7)
      ON CONFLICT ("claimId")
      DO UPDATE SET
        "riskLevel" = EXCLUDED."riskLevel",
        "riskScore" = EXCLUDED."riskScore",
        "fraudProbability" = EXCLUDED."fraudProbability",
        "modelVersion" = EXCLUDED."modelVersion",
        "riskFactors" = EXCLUDED."riskFactors",
        "aiProcessingStatus" = EXCLUDED."aiProcessingStatus",
        "updatedAt" = NOW()
      `,
      [
        assessment.riskLevel,
        assessment.riskScore,
        assessment.fraudProbability,
        config.modelVersion,
        JSON.stringify(assessment.riskFactors),
        "COMPLETED",
        claimId,
      ]
    );

    console.log("Combined risk assessment saved for:", claimId);
    return { status: "success", claimId, assessment };
  } finally {
    client.release();
  }
};
