# SiteFace v0.1

Visual property-change intelligence powered by BigQuery + Gemini.

## v0.1 goal

Upload a previous and current photograph of the same property area, then identify
visually supported material changes.

## Architecture

```text
Browser
  |
  v
Next.js /api/compare
  |
  +--> Cloud Storage
  |      before + after images
  |
  +--> BigQuery AI.GENERATE_TABLE
           |
           +--> Gemini remote model
           +--> OBJ.MAKE_REF(before image)
           +--> OBJ.MAKE_REF(after image)
           |
           v
       Structured comparison
           |
           v
       BigQuery inspections
```

## Prerequisites

- Node.js 20+
- Google Cloud CLI
- bq CLI
- GCP project with billing enabled

Authenticate:

```powershell
gcloud auth login
gcloud auth application-default login
```

## Bootstrap GCP

```powershell
powershell -ExecutionPolicy Bypass `
  -File ".\scripts\setup-gcp.ps1" `
  -ProjectId "YOUR_PROJECT_ID" `
  -Region "europe-west2" `
  -Bucket "YOUR_GLOBALLY_UNIQUE_BUCKET"
```

Then edit the sample project/bucket names in:

```text
sql/01-schema.sql
sql/02-object-table.sql
sql/03-model.sql
```

Run those SQL files in order in BigQuery.

## Configure locally

```powershell
Copy-Item ".env.local.example" ".env.local"
```

Edit `.env.local`:

```text
GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
GOOGLE_CLOUD_LOCATION=europe-west2
BIGQUERY_DATASET=siteface
BIGQUERY_MODEL=gemini_model
GCS_BUCKET=YOUR_BUCKET
```

## Run

```powershell
npm install
npm run dev
```

Open http://localhost:3000

## First experiment

Use two images of the same wall or fixture with similar framing. Introduce one
safe, obvious visual change in the second image, such as a removable sticker,
moved object or removed item.

SiteFace returns:

- changed
- change type
- finding
- previous severity
- current severity
- confidence
- summary
- recommended action

The result is also written to `siteface.inspections`.

## Important limitations

This is a proof of concept, not a certified inspection product. Do not use the
output as structural, electrical, fire, medical, legal or other safety-critical
professional advice.

Different lighting, camera angles and occlusion can produce false positives or
missed changes.

## v0.2

Recommended next additions:

1. per-image independent observations;
2. direct-comparison + independent-analysis consensus;
3. inspection timeline;
4. human feedback/correction;
5. embeddings and similar-defect search;
6. authentication and organisation tenancy;
7. Cloud Run deployment.
