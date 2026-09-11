import { BigQuery } from "@google-cloud/bigquery";

type AnyRecord = Record<string, any>;

export type SiteFaceComparable = {
  marketplace: string;
  title: string;
  price: number;
  currency: string;
  url: string;
  evidence_type: "listing";
};

export type SiteFaceMarketEvidence = {
  available: boolean;
  comparable_count: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  low: number | null;
  high: number | null;
  typical: number | null;
  currency: string;
  comparables: SiteFaceComparable[];
  note: string;
};

const projectId =
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  process.env.GCP_PROJECT_ID ||
  "siteface-dev";

const dataset = process.env.SITEFACE_BQ_DATASET || "siteface";
const model = process.env.SITEFACE_BQ_GEMINI_MODEL || "gemini_model";

const bigquery = new BigQuery({ projectId });

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }
  return trimmed;
}

function extractJsonObject(text: string): string {
  const clean = stripJsonFences(text);
  const first = clean.indexOf("{");
  const last = clean.lastIndexOf("}");
  if (first >= 0 && last > first) return clean.slice(first, last + 1);
  return clean;
}

function safeJson(text: string): AnyRecord | null {
  try {
    return JSON.parse(extractJsonObject(text));
  } catch {
    return null;
  }
}

function numberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
}

function confidenceFor(count: number): "LOW" | "MEDIUM" | "HIGH" {
  if (count >= 5) return "HIGH";
  if (count >= 3) return "MEDIUM";
  return "LOW";
}

function normaliseComparable(row: AnyRecord): SiteFaceComparable | null {
  const marketplace = String(row.marketplace || row.source || "").trim();
  const title = String(row.title || row.item || "").trim();
  const url = String(row.url || row.link || "").trim();
  const currency = String(row.currency || "GBP").trim().toUpperCase();
  const price = numberOrNull(row.price);

  if (!marketplace || !title || price === null || price < 0) return null;
  if (!/^https?:\/\//i.test(url)) return null;

  return {
    marketplace,
    title,
    price,
    currency,
    url,
    evidence_type: "listing",
  };
}

export async function generateMarketComparables(
  analysis: AnyRecord
): Promise<SiteFaceMarketEvidence> {
  const identity = analysis?.identification || analysis?.identity || {};
  const condition = analysis?.condition || {};
  const market = analysis?.market || {};

  const itemName =
    identity?.item_name ||
    identity?.name ||
    market?.search_query ||
    "physical item";

  const brand = identity?.brand || "";
  const modelName = identity?.model || "";
  const conditionLabel = condition?.label || condition?.condition || "";

  const prompt = `
You are SiteFace Market Evidence.

Find current UK marketplace evidence for the physical item below using Google Search grounding.

ITEM
Name: ${itemName}
Brand: ${brand || "unknown"}
Model: ${modelName || "unknown"}
Visible condition: ${conditionLabel || "unknown"}
Existing search hint: ${market?.search_query || "none"}

Return ONLY valid JSON in this exact shape:
{
  "comparables": [
    {
      "marketplace": "eBay UK",
      "title": "short listing title",
      "price": 24.99,
      "currency": "GBP",
      "url": "https://..."
    }
  ]
}

Rules:
- Maximum 5 comparables.
- Prefer exact brand/model matches, then close equivalents.
- UK results only where possible.
- Use live marketplace or retailer listing pages.
- Do not invent URLs, prices, marketplaces, titles or sold-status.
- Only return evidence you can ground in search results.
- If reliable evidence is unavailable, return {"comparables":[]}.
- price must be a number, without currency symbols.
- currency should normally be GBP.
- No markdown and no explanatory text.
`.trim();

  try {
    const sql = `
      SELECT
        result AS response,
        status
      FROM AI.GENERATE_TEXT(
        MODEL \`${projectId}.${dataset}.${model}\`,
        (SELECT @prompt AS prompt),
        STRUCT(
          0.0 AS temperature,
          1800 AS max_output_tokens,
          TRUE AS ground_with_google_search
        )
      )
    `;

    const [rows] = await bigquery.query({
      query: sql,
      params: { prompt },
      location: process.env.SITEFACE_BQ_LOCATION || "europe-west2",
    });

    const first: AnyRecord = (rows as AnyRecord[])[0] || {};
    if (first.status) {
      console.warn("[SiteFace] Market evidence model status:", first.status);
    }

    const parsed = safeJson(String(first.response || ""));
    const raw = Array.isArray(parsed?.comparables) ? parsed!.comparables : [];
    const comparables = raw
      .map((x: AnyRecord) => normaliseComparable(x))
      .filter(Boolean)
      .slice(0, 5) as SiteFaceComparable[];

    const prices = comparables
      .filter((x) => x.currency === "GBP")
      .map((x) => x.price);

    return {
      available: comparables.length > 0,
      comparable_count: comparables.length,
      confidence: confidenceFor(comparables.length),
      low: prices.length ? Math.min(...prices) : null,
      high: prices.length ? Math.max(...prices) : null,
      typical: median(prices),
      currency: "GBP",
      comparables,
      note: comparables.length
        ? "Live listing evidence retrieved using grounded search. Asking prices are not the same as completed sale prices."
        : "No reliable grounded marketplace comparables were returned for this item.",
    };
  } catch (error) {
    console.warn("[SiteFace] Market comparables unavailable:", error);
    return {
      available: false,
      comparable_count: 0,
      confidence: "LOW",
      low: null,
      high: null,
      typical: null,
      currency: "GBP",
      comparables: [],
      note: "Comparable market evidence is temporarily unavailable.",
    };
  }
}
