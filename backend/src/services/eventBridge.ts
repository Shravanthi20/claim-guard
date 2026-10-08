import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";

const eventBridge = new EventBridgeClient({
  region: process.env.AWS_REGION,
});

export const publishEvidenceUploadedEvent = async (
  claimId: string,
  evidenceId: string,
  s3Key: string,
  fileType: string,
  mlFeatures: {
    claimAmount: number;
    claimAgeDays: number;
    previousClaims: number;
    policyAgeDays: number;
    evidenceCount: number;
  }
) => {
  // Publishes to the default bus matching the existing EventBridge rule:
  // source: "claimguard.api", detail-type: "ClaimSubmitted"
  // which routes → SQS claimguard-ai-processing → claimguard-processor-dev → Step Functions
  const command = new PutEventsCommand({
    Entries: [
      {
        EventBusName: "default",
        Source: "claimguard.api",
        DetailType: "ClaimSubmitted",
        Detail: JSON.stringify({
          claimId,
          evidenceId,
          s3Key,
          fileType,
          mlFeatures,
        }),
      },
    ],
  });

  const response = await eventBridge.send(command);

  if (
    response.FailedEntryCount &&
    response.FailedEntryCount > 0
  ) {
    throw new Error("Failed to publish ClaimSubmitted event");
  }

  return response;
};