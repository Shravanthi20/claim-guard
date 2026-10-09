import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const handler = async (event) => {
  console.log("Result Writer input:", JSON.stringify(event));

  const claimId = event.claimId;
  const fraudProbability = event.fraudProbability !== undefined ? event.fraudProbability : event.modelResult?.fraudProbability;
  const riskScore = event.riskScore !== undefined ? event.riskScore : event.modelResult?.riskScore;
  const riskLevel = event.riskLevel || event.modelResult?.riskLevel;
  const imageAnalysisResults = event.imageAnalysisResults || [];

  if (
    !claimId ||
    fraudProbability === undefined ||
    riskScore === undefined ||
    !riskLevel
  ) {
    throw new Error(
      "claimId, fraudProbability, riskScore and riskLevel are required"
    );
  }

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
        riskLevel,
        Number(riskScore),
        Number(fraudProbability),
        "xgboost-v1",
        JSON.stringify({ imageAnalysisResults }),
        "COMPLETED",
        claimId,
      ]
    );

    console.log("Risk assessment saved for:", claimId);

    return {
      status: "success",
      claimId,
    };
  } finally {
    client.release();
  }
};