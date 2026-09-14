import { createHash } from "node:crypto";
import { bigquery, dataset, location, projectId } from "./google";

export type AskSAVPlan = "FREE" | "VIC_PLUS" | "VIC_PRO";

export type AskSAVServerEntitlements = {
  monthlyAnalyses: number | "FAIR_USE";
  savedItems: number | "UNLIMITED";
  fullMarketEvidence: boolean;
  valueHistory: boolean;
  valueAlerts: boolean;
  sellingTools: "NONE" | "LIMITED" | "FULL";
};

export type AskSAVAccountState = {
  uid: string;
  email: string | null;
  plan: AskSAVPlan;
  entitlements: AskSAVServerEntitlements;
  usage: {
    analysesUsed: number;
    analysesLimit: number | "FAIR_USE";
    remaining: number | "FAIR_USE";
    periodKey: string;
  };
};

export const ASKSAV_PLAN_ENTITLEMENTS: Record<AskSAVPlan, AskSAVServerEntitlements> = {
  FREE: {
    monthlyAnalyses: 5,
    savedItems: 5,
    fullMarketEvidence: false,
    valueHistory: false,
    valueAlerts: false,
    sellingTools: "NONE",
  },
  VIC_PLUS: {
    monthlyAnalyses: 50,
    savedItems: 100,
    fullMarketEvidence: true,
    valueHistory: true,
    valueAlerts: false,
    sellingTools: "LIMITED",
  },
  VIC_PRO: {
    monthlyAnalyses: "FAIR_USE",
    savedItems: "UNLIMITED",
    fullMarketEvidence: true,
    valueHistory: true,
    valueAlerts: true,
    sellingTools: "FULL",
  },
};

const ACCOUNTS_TABLE = "asksav_accounts";
const USAGE_TABLE = "asksav_monthly_usage";
let schemaPromise: Promise<void> | null = null;

function table(name: string) {
  return "`" + projectId + "." + dataset + "." + name + "`";
}

export function currentUsagePeriod(now = new Date()) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function getAskSAVInternalAnalysisKey() {
  const material =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64 ||
    process.env.GOOGLE_PRIVATE_KEY ||
    process.env.ASKSAV_INTERNAL_API_KEY ||
    "";

  if (!material) return "";

  return createHash("sha256")
    .update(`asksav-v0.20:${material}`)
    .digest("hex");
}

async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await bigquery.query({
        location,
        query: `
          CREATE TABLE IF NOT EXISTS ${table(ACCOUNTS_TABLE)} (
            uid STRING NOT NULL,
            email STRING,
            plan STRING NOT NULL,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL
          )
        `,
      });

      await bigquery.query({
        location,
        query: `
          CREATE TABLE IF NOT EXISTS ${table(USAGE_TABLE)} (
            uid STRING NOT NULL,
            period_key STRING NOT NULL,
            analyses_used INT64 NOT NULL,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL
          )
        `,
      });
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }

  await schemaPromise;
}

export async function verifyFirebaseRequest(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error("AUTH_REQUIRED");

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
  if (!apiKey) throw new Error("FIREBASE_API_KEY_MISSING");

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken: match[1] }),
      cache: "no-store",
    }
  );

  if (!response.ok) throw new Error("AUTH_INVALID");

  const payload = await response.json();
  const user = payload?.users?.[0];
  if (!user?.localId) throw new Error("AUTH_INVALID");

  return {
    uid: String(user.localId),
    email: user.email ? String(user.email) : null,
  };
}

function normalisePlan(value: unknown): AskSAVPlan {
  return value === "VIC_PLUS" || value === "VIC_PRO" ? value : "FREE";
}

export async function getAskSAVAccountState(
  identity: { uid: string; email: string | null }
): Promise<AskSAVAccountState> {
  await ensureSchema();
  const periodKey = currentUsagePeriod();

  await bigquery.query({
    location,
    query: `
      MERGE ${table(ACCOUNTS_TABLE)} T
      USING (SELECT @uid AS uid, @email AS email) S
      ON T.uid = S.uid
      WHEN MATCHED THEN
        UPDATE SET email = COALESCE(S.email, T.email), updated_at = CURRENT_TIMESTAMP()
      WHEN NOT MATCHED THEN
        INSERT (uid, email, plan, created_at, updated_at)
        VALUES (S.uid, S.email, 'FREE', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())
    `,
    params: { uid: identity.uid, email: identity.email },
  });

  await bigquery.query({
    location,
    query: `
      MERGE ${table(USAGE_TABLE)} T
      USING (SELECT @uid AS uid, @periodKey AS period_key) S
      ON T.uid = S.uid AND T.period_key = S.period_key
      WHEN NOT MATCHED THEN
        INSERT (uid, period_key, analyses_used, created_at, updated_at)
        VALUES (S.uid, S.period_key, 0, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())
    `,
    params: { uid: identity.uid, periodKey },
  });

  const [rows] = await bigquery.query({
    location,
    query: `
      SELECT
        A.plan,
        U.analyses_used
      FROM ${table(ACCOUNTS_TABLE)} A
      JOIN ${table(USAGE_TABLE)} U
        ON A.uid = U.uid
       AND U.period_key = @periodKey
      WHERE A.uid = @uid
      LIMIT 1
    `,
    params: { uid: identity.uid, periodKey },
  });

  const row = (rows as any[])?.[0] || {};
  const plan = normalisePlan(row.plan);
  const entitlements = ASKSAV_PLAN_ENTITLEMENTS[plan];
  const analysesUsed = Number(row.analyses_used || 0);
  const analysesLimit = entitlements.monthlyAnalyses;
  const remaining =
    typeof analysesLimit === "number"
      ? Math.max(0, analysesLimit - analysesUsed)
      : "FAIR_USE";

  return {
    uid: identity.uid,
    email: identity.email,
    plan,
    entitlements,
    usage: {
      analysesUsed,
      analysesLimit,
      remaining,
      periodKey,
    },
  };
}

export async function reserveAskSAVAnalysis(
  identity: { uid: string; email: string | null }
) {
  const before = await getAskSAVAccountState(identity);
  const limit = before.entitlements.monthlyAnalyses;

  if (typeof limit === "number" && before.usage.analysesUsed >= limit) {
    return { allowed: false as const, state: before };
  }

  await bigquery.query({
    location,
    query: `
      UPDATE ${table(USAGE_TABLE)}
      SET analyses_used = analyses_used + 1,
          updated_at = CURRENT_TIMESTAMP()
      WHERE uid = @uid
        AND period_key = @periodKey
    `,
    params: { uid: identity.uid, periodKey: before.usage.periodKey },
  });

  const after = await getAskSAVAccountState(identity);
  return { allowed: true as const, state: after };
}

export async function releaseAskSAVAnalysis(
  identity: { uid: string; email: string | null },
  periodKey: string
) {
  await ensureSchema();
  await bigquery.query({
    location,
    query: `
      UPDATE ${table(USAGE_TABLE)}
      SET analyses_used = GREATEST(analyses_used - 1, 0),
          updated_at = CURRENT_TIMESTAMP()
      WHERE uid = @uid
        AND period_key = @periodKey
    `,
    params: { uid: identity.uid, periodKey },
  });
}
