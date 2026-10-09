import {
    SFNClient,
    StartExecutionCommand
} from "@aws-sdk/client-sfn";

const sfn = new SFNClient({});

const STATE_MACHINE_ARN =
    "arn:aws:states:us-east-1:721194821024:stateMachine:ClaimGuardAIWorkflow";

export const handler = async (event) => {
    console.log("SQS event:", JSON.stringify(event));

    for (const record of event.Records) {
        let message;

        try {
            message = JSON.parse(record.body);
        } catch {
            message = record.body;
        }

        console.log("Starting workflow with:", JSON.stringify(message));

        const command = new StartExecutionCommand({
            stateMachineArn: STATE_MACHINE_ARN,
            input: JSON.stringify(message)
        });

        const response = await sfn.send(command);

        console.log(
            "Step Functions execution started:",
            response.executionArn
        );
    }

    return {
        statusCode: 200,
        body: "Step Functions executions started successfully"
    };
};