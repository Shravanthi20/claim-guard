import {
  SageMakerRuntimeClient,
  InvokeEndpointCommand
} from "@aws-sdk/client-sagemaker-runtime";

import {
  RekognitionClient,
  DetectLabelsCommand
} from "@aws-sdk/client-rekognition";

const rekognition = new RekognitionClient({});
const sagemaker = new SageMakerRuntimeClient({});

const SAGEMAKER_ENDPOINT = "claimguard-risk-model-endpoint";

export const handler = async (event) => {
  console.log("AI Worker input:", JSON.stringify(event));

  // The event may arrive directly OR wrapped in an EventBridge envelope
  // (detail-type: ClaimSubmitted) where the actual payload is in event.detail
  const payload = event["detail-type"] === "ClaimSubmitted" ? event.detail : event;

  const {
      claimId,
      evidenceId,
      s3Key,
      fileType,
      mlFeatures = {}
  } = payload;

  // mlFeatures may be a nested object or flattened at the root
  const claimAmount    = mlFeatures.claimAmount    ?? payload.claimAmount    ?? 0;
  const claimAgeDays   = mlFeatures.claimAgeDays   ?? payload.claimAgeDays   ?? 30;
  const previousClaims = mlFeatures.previousClaims ?? payload.previousClaims ?? 0;
  const policyAgeDays  = mlFeatures.policyAgeDays  ?? payload.policyAgeDays  ?? 365;
  const evidenceCount  = mlFeatures.evidenceCount  ?? payload.evidenceCount  ?? 1;

  if (!claimId) {
      throw new Error("Missing claimId");
  }

  if (!s3Key) {
      throw new Error("Missing s3Key");
  }

  // ----------------------------------------
  // 1. REKOGNITION - Image damage analysis
  // ----------------------------------------

  let imageAnalysisResults = [];

  try {
      const labelsResponse = await rekognition.send(
          new DetectLabelsCommand({
              Image: {
                  S3Object: {
                      Bucket: "claimguard-evidence-2026",
                      Name: s3Key
                  }
              },
              MaxLabels: 20,
              MinConfidence: 60
          })
      );

      imageAnalysisResults = (labelsResponse.Labels || []).map(label => ({
          name: label.Name,
          confidence: label.Confidence
      }));

      console.log(
          "Rekognition labels:",
          JSON.stringify(imageAnalysisResults)
      );

  } catch (error) {
      console.error("Rekognition error (non-fatal):", error.message);
      // Non-fatal: proceed without image analysis if it fails
  }

  // ----------------------------------------
  // 2. SAGEMAKER - Fraud probability model
  // ----------------------------------------

  const csvPayload = [
      claimAmount,
      claimAgeDays,
      previousClaims,
      policyAgeDays,
      evidenceCount
  ].join(",");

  console.log("SageMaker CSV input:", csvPayload);

  let fraudProbability = 0.1; // safe default if SageMaker fails

  try {
      const response = await sagemaker.send(
          new InvokeEndpointCommand({
              EndpointName: SAGEMAKER_ENDPOINT,
              ContentType: "text/csv",
              Body: Buffer.from(csvPayload)
          })
      );

      const rawResult = Buffer
          .from(response.Body)
          .toString("utf-8")
          .trim();

      const parsed = parseFloat(rawResult);
      if (Number.isFinite(parsed)) {
          fraudProbability = parsed;
      }

      console.log(
          "SageMaker fraud probability:",
          fraudProbability
      );

  } catch (error) {
      console.error("SageMaker error:", error.message);
      throw error; // SageMaker failure is fatal - retry via Step Functions
  }

  // ----------------------------------------
  // 3. MULTI-MODAL RISK FUSION (SageMaker + Rekognition + Claim Profile)
  // ----------------------------------------

  const DAMAGE_WEIGHTS = {
    "Car Front - Damaged": 1.0,
    "Totaled": 1.0,
    "Collision": 0.9,
    "Accident": 0.85,
    "Wreck": 0.9,
    "Damage": 0.8,
    "Crash": 0.9,
    "Dent": 0.6,
    "Scratch": 0.5,
    "Broken": 0.6
  };

  let maxImageDamageSignal = 0;
  const matchedDamageLabels = [];

  for (const label of imageAnalysisResults) {
    const weight = DAMAGE_WEIGHTS[label.name];
    if (weight) {
      const signal = (label.confidence / 100) * weight;
      matchedDamageLabels.push({ name: label.name, confidence: label.confidence, weight });
      if (signal > maxImageDamageSignal) {
        maxImageDamageSignal = signal;
      }
    }
  }

  // Claim amount risk scale (claims > 100,000 carry higher exposure)
  const amountRisk = Math.min(1.0, Number(claimAmount) / 200000);

  // Fusion: 40% Image Damage Severity + 35% Tabular Fraud Model + 25% Claim Amount Exposure
  const fusedProbability = Math.min(
    1.0,
    (maxImageDamageSignal * 0.40) + (fraudProbability * 0.35) + (amountRisk * 0.25)
  );

  const riskScore = Math.round(fusedProbability * 100 * 10) / 10;
  let riskLevel = "LOW";
  if (riskScore >= 60) {
    riskLevel = "HIGH";
  } else if (riskScore >= 25) {
    riskLevel = "MEDIUM";
  }

  console.log(`Risk Fusion: ImageSignal=${maxImageDamageSignal.toFixed(3)}, FraudProb=${fraudProbability.toFixed(3)}, AmountRisk=${amountRisk.toFixed(3)} => FusedScore=${riskScore} (${riskLevel})`);

  const result = {
      claimId,
      evidenceId,
      s3Key,
      fileType,
      fraudProbability: fusedProbability,
      riskScore,
      riskLevel,
      modelResult: {
          fraudProbability: fusedProbability,
          riskScore,
          riskLevel
      },
      mlFeatures: {
          claimAmount,
          claimAgeDays,
          previousClaims,
          policyAgeDays,
          evidenceCount
      },
      imageAnalysisResults,
      matchedDamageLabels
  };

  console.log(
      "AI Worker result:",
      JSON.stringify(result)
  );

  return result;
};