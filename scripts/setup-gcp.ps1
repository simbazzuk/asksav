param(
  [string]$ProjectId = "siteface-dev",
  [string]$Region = "europe-west2",
  [string]$Dataset = "siteface",
  [string]$Bucket = "",
  [string]$Connection = "siteface-connection"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Bucket)) {
  $Bucket = "$ProjectId-images"
}

Write-Host ""
Write-Host "SiteFace v0.1 - GCP bootstrap"
Write-Host "Project:    $ProjectId"
Write-Host "Region:     $Region"
Write-Host "Dataset:    $Dataset"
Write-Host "Bucket:     $Bucket"
Write-Host "Connection: $Connection"
Write-Host ""

gcloud config set project $ProjectId

gcloud services enable `
  bigquery.googleapis.com `
  bigqueryconnection.googleapis.com `
  storage.googleapis.com `
  aiplatform.googleapis.com

gcloud storage buckets describe "gs://$Bucket" 2>$null
if ($LASTEXITCODE -ne 0) {
  gcloud storage buckets create "gs://$Bucket" `
    --location=$Region `
    --uniform-bucket-level-access
}

bq --location=$Region show "$ProjectId`:$Dataset" 2>$null
if ($LASTEXITCODE -ne 0) {
  bq --location=$Region mk --dataset "$ProjectId`:$Dataset"
}

bq show --connection --location=$Region "$ProjectId.$Region.$Connection" 2>$null
if ($LASTEXITCODE -ne 0) {
  bq mk `
    --connection `
    --location=$Region `
    --project_id=$ProjectId `
    --connection_type=CLOUD_RESOURCE `
    $Connection
}

$connectionJson = bq show `
  --connection `
  --format=prettyjson `
  --location=$Region `
  "$ProjectId.$Region.$Connection" | ConvertFrom-Json

$connectionServiceAccount = $connectionJson.cloudResource.serviceAccountId

if ([string]::IsNullOrWhiteSpace($connectionServiceAccount)) {
  throw "Could not determine the BigQuery connection service account."
}

gcloud storage buckets add-iam-policy-binding "gs://$Bucket" `
  --member="serviceAccount:$connectionServiceAccount" `
  --role="roles/storage.objectViewer"

gcloud projects add-iam-policy-binding $ProjectId `
  --member="serviceAccount:$connectionServiceAccount" `
  --role="roles/aiplatform.user"

Write-Host ""
Write-Host "Bootstrap complete."
Write-Host "Connection service account: $connectionServiceAccount"
Write-Host ""
Write-Host "Next: update sql/*.sql and .env.local with your actual project/bucket names."
