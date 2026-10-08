# ClaimGuard AI result writer

The result writer expects a single event containing the model result, the
Rekognition findings, and the exact feature vector used by the model:

```json
{
  "claimId": "claim-id",
  "mlFeatures": {
    "claimAmount": 150000,
    "claimAgeDays": 1,
    "previousClaims": 0,
    "policyAgeDays": 365,
    "evidenceCount": 1
  },
  "modelResult": {
    "fraudProbability": 0.02,
    "riskScore": 2.0,
    "riskLevel": "LOW"
  },
  "imageAnalysisResults": [
    { "name": "Car Front - Damaged", "confidence": 92.5 }
  ]
}
```

`MODEL_WEIGHT`, `REKOGNITION_WEIGHT`, `RISK_THRESHOLDS_JSON`, and
`REKOGNITION_LABEL_WEIGHTS_JSON` are required deployment configuration. The
source code contains no risk thresholds or label weights. The final risk level
is derived from the fused probability; the model-provided level is retained
only as an audit value.

`MODEL_PROBABILITY_SCALE` must be `0_1` when the model returns probabilities
such as `0.02`, or `0_100` when it returns percentages such as `2.0`. The
writer normalizes the value before fusion and records the selected scale.
Rekognition labels that are not present in
`REKOGNITION_LABEL_WEIGHTS_JSON` are retained for audit but contribute zero to
fraud risk. Generic object labels such as `Laptop`, `Computer`, and `Monitor`
therefore do not become fraud indicators automatically.

The persisted `riskFactors` object contains the feature vector, raw model
result, Rekognition findings, image contributions, and fusion configuration.
This makes each decision traceable and allows the model consumer to be
validated independently.
