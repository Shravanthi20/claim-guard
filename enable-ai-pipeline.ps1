$ErrorActionPreference = "Stop"

Write-Host "Checking AWS Lambda triggers..."
$functionName = "claimguard-processor-dev"
$targetQueue = "claimguard-ai-processing"

$mappings = aws lambda list-event-source-mappings --function-name $functionName --query "EventSourceMappings[?contains(EventSourceArn, '$targetQueue')].UUID" --output text

if ([string]::IsNullOrWhiteSpace($mappings)) {
    Write-Host "No trigger found for $targetQueue. Please ensure the queue and lambda function exist." -ForegroundColor Yellow
} else {
    foreach ($uuid in $mappings.Split("`t`n ")) {
        if (-not [string]::IsNullOrWhiteSpace($uuid)) {
            Write-Host "Enabling SQS trigger ($uuid)..."
            aws lambda update-event-source-mapping --uuid $uuid --enabled | Out-Null
            Write-Host "Successfully enabled AI pipeline trigger!" -ForegroundColor Green
        }
    }
}
