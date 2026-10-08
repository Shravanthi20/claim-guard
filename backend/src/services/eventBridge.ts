import {
  EventBridgeV2Client,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridgev2";

const eventBridge = new EventBridgeV2Client({
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
  const command = new PutEventsCommand({
    EventBusArn: process.env.EVENT_BUS_ARN!,
    Entries: [
      {
        Source: "claimguard",
        DetailType: "EvidenceUploaded",
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
    throw new Error("Failed to publish EvidenceUploaded event");
  }

  return response;
};