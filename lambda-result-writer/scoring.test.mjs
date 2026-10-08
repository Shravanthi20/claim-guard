import assert from "node:assert/strict";
import test from "node:test";
import { combineAssessment } from "./scoring.mjs";

const config = {
  modelWeight: 0.7,
  imageWeight: 0.3,
  lowMaximum: 0.33,
  mediumMaximum: 0.66,
  labelWeights: { "Car Front - Damaged": 1 },
  modelVersion: "test",
  modelProbabilityScale: "0_1",
};

const features = {
  claimAmount: 100,
  claimAgeDays: 1,
  previousClaims: 0,
  policyAgeDays: 365,
  evidenceCount: 1,
};

test("fuses model probability and configured image findings", () => {
  const result = combineAssessment({
    config,
    mlFeatures: features,
    modelResult: { fraudProbability: 0.02 },
    imageAnalysisResults: [
      { name: "Car Front - Damaged", confidence: 92.5 },
    ],
  });

  assert.equal(result.riskLevel, "LOW");
  assert.equal(result.riskFactors.mlFeatures.evidenceCount, 1);
  assert.equal(result.riskFactors.imageContributions[0].label, "Car Front - Damaged");
  assert.ok(result.fraudProbability > 0.02);
});

test("rejects an incomplete feature vector", () => {
  assert.throws(
    () =>
      combineAssessment({
        config,
        mlFeatures: { ...features, policyAgeDays: undefined },
        modelResult: { fraudProbability: 0.2 },
        imageAnalysisResults: [],
      }),
    /mlFeatures\.policyAgeDays/
  );
});

test("rejects invalid model probabilities", () => {
  assert.throws(
    () =>
      combineAssessment({
        config,
        mlFeatures: features,
        modelResult: { fraudProbability: 1.2 },
        imageAnalysisResults: [],
      }),
    /modelResult\.fraudProbability/
  );
});

test("does not treat generic object labels as risk findings", () => {
  const result = combineAssessment({
    config,
    mlFeatures: features,
    modelResult: { fraudProbability: 0.02 },
    imageAnalysisResults: [
      { name: "Computer", confidence: 99.9 },
      { name: "Laptop", confidence: 99.9 },
      { name: "Monitor", confidence: 96.7 },
    ],
  });

  assert.equal(result.riskFactors.imageRiskSignal, 0);
  assert.equal(result.riskFactors.imageSummary.matchedRiskFindings, 0);
  assert.deepEqual(result.riskFactors.imageSummary.ignoredNonRiskFindings, [
    "Computer",
    "Laptop",
    "Monitor",
  ]);
  assert.equal(result.riskLevel, "LOW");
});

test("normalizes percentage model probabilities when configured", () => {
  const result = combineAssessment({
    config: { ...config, modelProbabilityScale: "0_100" },
    mlFeatures: features,
    modelResult: { fraudProbability: 80 },
    imageAnalysisResults: [],
  });

  assert.ok(Math.abs(result.fraudProbability - 0.56) < Number.EPSILON);
  assert.equal(result.riskLevel, "MEDIUM");
});
