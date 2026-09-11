import { BigQuery } from "@google-cloud/bigquery";
import { Storage } from "@google-cloud/storage";

export const projectId = process.env.GOOGLE_CLOUD_PROJECT!;
export const location = process.env.GOOGLE_CLOUD_LOCATION || "europe-west2";
export const dataset = process.env.BIGQUERY_DATASET || "siteface";
export const model = process.env.BIGQUERY_MODEL || "gemini_model";
export const bucketName = process.env.GCS_BUCKET!;

if (!projectId || !bucketName) {
  throw new Error("Missing GOOGLE_CLOUD_PROJECT or GCS_BUCKET environment variables.");
}

export const bigquery = new BigQuery({ projectId, location });
export const storage = new Storage({ projectId });
