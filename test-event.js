const { EventBridgeClient, PutEventsCommand } = require("@aws-sdk/client-eventbridge");
const eventBridge = new EventBridgeClient({ region: "us-east-1" });

async function run() {
  const command = new PutEventsCommand({
    Entries: [
      {
        EventBusName: "default",
        Source: "claimguard.api",
        DetailType: "ClaimSubmitted",
        Detail: JSON.stringify({
          claimId: "0b15b9df-cf17-47ab-a70e-1172a5b6f0dd", // Need a real claim id to test DB update, let's just trigger it first
          mlFeatures: { claimAmount: 1500, claimAgeDays: 1, previousClaims: 0, policyAgeDays: 150, evidenceCount: 1 }
        })
      }
    ]
  });
  console.log(await eventBridge.send(command));
}
run();
