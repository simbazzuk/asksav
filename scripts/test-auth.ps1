Write-Host "Checking Google Cloud CLI..."
gcloud --version

Write-Host ""
Write-Host "Active account:"
gcloud auth list --filter=status:ACTIVE

Write-Host ""
Write-Host "Testing Application Default Credentials..."
gcloud auth application-default print-access-token | Out-Null

if ($LASTEXITCODE -eq 0) {
  Write-Host "ADC credentials look good."
} else {
  Write-Host "Run: gcloud auth application-default login"
}
