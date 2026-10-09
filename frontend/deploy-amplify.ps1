$ErrorActionPreference = "Stop"
$appId = "d1m0d44adxzx2b"
$branch = "main"

npm run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

node zipper.cjs | Out-Null
Start-Sleep -Seconds 2

$dep = aws amplify create-deployment --app-id $appId --branch-name $branch | ConvertFrom-Json
Write-Host "Created deployment job $($dep.jobId)"

$bytes = [System.IO.File]::ReadAllBytes((Join-Path $PSScriptRoot "amplify-deploy.zip"))
$resp = Invoke-WebRequest -Uri $dep.zipUploadUrl -Method Put -Body $bytes -ContentType "application/zip" -UseBasicParsing
Write-Host "Upload status: $($resp.StatusCode)"

aws amplify start-deployment --app-id $appId --branch-name $branch --job-id $dep.jobId --query 'jobSummary.status' --output text

do {
  Start-Sleep -Seconds 5
  $status = aws amplify get-job --app-id $appId --branch-name $branch --job-id $dep.jobId --query 'job.summary.status' --output text
  Write-Host "Job $($dep.jobId): $status"
} while ($status -in @("PENDING", "PROVISIONING", "RUNNING"))
