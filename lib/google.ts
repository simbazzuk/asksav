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

const credentials =
  process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY
    ? {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }
    : undefined;

export const bigquery = new BigQuery({
  projectId,
  location,
  credentials,
});
export const storage = new Storage({
  projectId,
  credentials,
});
