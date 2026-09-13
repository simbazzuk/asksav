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

type GoogleServiceAccountCredentials = {
  client_email: string;
  private_key: string;
};

function getGoogleServiceAccountCredentials(): GoogleServiceAccountCredentials | undefined {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64?.trim();

  if (encoded) {
    try {
      const decoded = Buffer.from(encoded, "base64").toString("utf8");
      const parsed = JSON.parse(decoded) as {
        client_email?: string;
        private_key?: string;
      };

      if (!parsed.client_email || !parsed.private_key) {
        throw new Error(
          "Decoded service account JSON is missing client_email or private_key."
        );
      }

      return {
        client_email: parsed.client_email,
        private_key: parsed.private_key,
      };
    } catch (error) {
      throw new Error(
        `Invalid GOOGLE_SERVICE_ACCOUNT_JSON_B64: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }

  return undefined;
}

const credentials = getGoogleServiceAccountCredentials();

export const bigquery = new BigQuery({
  projectId,
  location,
  credentials,
});
export const storage = new Storage({
  projectId,
  credentials,
});
