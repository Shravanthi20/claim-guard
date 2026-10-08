const requiredNumber = (name, value, { min, max }) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`${name} must be a number between ${min} and ${max}`);
  }
  return number;
};

const parseJsonEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${name} must contain valid JSON`);
  }
};

export const loadScoringConfig = () => {
  const thresholds = parseJsonEnv("RISK_THRESHOLDS_JSON");
  const labelWeights = parseJsonEnv("REKOGNITION_LABEL_WEIGHTS_JSON");
  if (
    !thresholds ||
    typeof thresholds !== "object" ||
    Array.isArray(thresholds)
  ) {
    throw new Error("RISK_THRESHOLDS_JSON must be an object");
  }
  const modelWeight = requiredNumber("MODEL_WEIGHT", process.env.MODEL_WEIGHT, {
    min: 0,
    max: 1,
  });
  const imageWeight = requiredNumber(
    "REKOGNITION_WEIGHT",
    process.env.REKOGNITION_WEIGHT,
    { min: 0, max: 1 }
  );
  const modelVersion = process.env.AI_MODEL_VERSION;
  if (!modelVersion) {
    throw new Error("AI_MODEL_VERSION is required");
  }
  const modelProbabilityScale = process.env.MODEL_PROBABILITY_SCALE;
  if (!["0_1", "0_100"].includes(modelProbabilityScale)) {
    throw new Error("MODEL_PROBABILITY_SCALE must be either 0_1 or 0_100");
  }
  const lowMaximum = requiredNumber("RISK_THRESHOLDS_JSON.lowMaximum", thresholds.lowMaximum, {
    min: 0,
    max: 1,
  });
  const mediumMaximum = requiredNumber(
    "RISK_THRESHOLDS_JSON.mediumMaximum",
    thresholds.mediumMaximum,
    { min: lowMaximum, max: 1 }
  );

  if (modelWeight + imageWeight <= 0) {
    throw new Error("MODEL_WEIGHT and REKOGNITION_WEIGHT cannot both be zero");
  }
  if (
    !labelWeights ||
    typeof labelWeights !== "object" ||
    Array.isArray(labelWeights)
  ) {
    throw new Error("REKOGNITION_LABEL_WEIGHTS_JSON must be an object");
  }
  for (const [label, weight] of Object.entries(labelWeights)) {
    requiredNumber(`REKOGNITION_LABEL_WEIGHTS_JSON.${label}`, weight, {
      min: 0,
      max: 1,
    });
  }

  return {
    modelWeight,
    imageWeight,
    lowMaximum,
    mediumMaximum,
    labelWeights,
    modelVersion,
    modelProbabilityScale,
  };
};

const validateFeatures = (features) => {
  if (!features || typeof features !== "object") {
    throw new Error("mlFeatures is required");
  }
  return {
    claimAmount: requiredNumber("mlFeatures.claimAmount", features.claimAmount, {
      min: 0,
      max: Number.MAX_SAFE_INTEGER,
    }),
    claimAgeDays: requiredNumber("mlFeatures.claimAgeDays", features.claimAgeDays, {
      min: 0,
      max: Number.MAX_SAFE_INTEGER,
    }),
    previousClaims: requiredNumber(
      "mlFeatures.previousClaims",
      features.previousClaims,
      { min: 0, max: Number.MAX_SAFE_INTEGER }
    ),
    policyAgeDays: requiredNumber(
      "mlFeatures.policyAgeDays",
      features.policyAgeDays,
      { min: 0, max: Number.MAX_SAFE_INTEGER }
    ),
    evidenceCount: requiredNumber(
      "mlFeatures.evidenceCount",
      features.evidenceCount,
      { min: 0, max: Number.MAX_SAFE_INTEGER }
    ),
  };
};

const validateFindings = (findings) => {
  if (!Array.isArray(findings)) {
    throw new Error("imageAnalysisResults must be an array");
  }
  return findings.map((finding, index) => {
    if (!finding || typeof finding !== "object") {
      throw new Error(`imageAnalysisResults[${index}] must be an object`);
    }
    if (typeof finding.name !== "string" || !finding.name.trim()) {
      throw new Error(`imageAnalysisResults[${index}].name is required`);
    }
    return {
      ...finding,
      confidence: requiredNumber(
        `imageAnalysisResults[${index}].confidence`,
        finding.confidence,
        { min: 0, max: 100 }
      ),
    };
  });
};

export const combineAssessment = ({
  modelResult,
  imageAnalysisResults,
  mlFeatures,
  config,
}) => {
  const rawModelProbability = requiredNumber(
    "modelResult.fraudProbability",
    modelResult?.fraudProbability,
    { min: 0, max: config.modelProbabilityScale === "0_100" ? 100 : 1 }
  );
  const modelProbability =
    config.modelProbabilityScale === "0_100"
      ? rawModelProbability / 100
      : rawModelProbability;
  const findings = validateFindings(imageAnalysisResults);
  const features = validateFeatures(mlFeatures);

  const imageContributions = findings
    .map((finding) => {
      const weight = Number(config.labelWeights[finding.name]);
      if (!Number.isFinite(weight) || weight < 0 || weight > 1) {
        return null;
      }
      return {
        label: finding.name,
        confidence: finding.confidence,
        weight,
        contribution: (finding.confidence / 100) * weight,
      };
    })
    .filter(Boolean);
  const ignoredImageFindings = findings
    .filter((finding) => !imageContributions.some((item) => item.label === finding.name))
    .map((finding) => finding.name);

  const imageRiskSignal =
    imageContributions.length === 0
      ? 0
      : Math.min(
          1,
          imageContributions.reduce(
            (total, contribution) => total + contribution.contribution,
            0
          )
        );
  const combinedProbability =
    (modelProbability * config.modelWeight +
      imageRiskSignal * config.imageWeight) /
    (config.modelWeight + config.imageWeight);
  const riskLevel =
    combinedProbability <= config.lowMaximum
      ? "LOW"
      : combinedProbability <= config.mediumMaximum
        ? "MEDIUM"
        : "HIGH";

  return {
    riskLevel,
    riskScore: combinedProbability * 100,
    fraudProbability: combinedProbability,
    riskFactors: {
      mlFeatures: features,
      modelResult: {
        fraudProbability: modelProbability,
        riskScore: modelResult.riskScore ?? null,
        riskLevel: modelResult.riskLevel ?? null,
      },
      imageAnalysisResults: findings,
      imageSummary: {
        totalFindings: findings.length,
        matchedRiskFindings: imageContributions.length,
        ignoredNonRiskFindings: ignoredImageFindings,
      },
      imageRiskSignal,
      imageContributions,
      fusion: {
        modelWeight: config.modelWeight,
        rekognitionWeight: config.imageWeight,
        lowMaximum: config.lowMaximum,
        mediumMaximum: config.mediumMaximum,
        modelProbabilityScale: config.modelProbabilityScale,
      },
    },
  };
};
