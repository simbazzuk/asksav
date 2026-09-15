import { getAskSAVAccountState, verifyFirebaseRequest } from "../../../../lib/v20-entitlements";
import { generateAskSavOnDemandMarket } from "../../../../lib/item-intelligence";

export const runtime = "nodejs";
export const maxDuration = 60;

async function verifyFirebaseBearer(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token) return null;

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    throw new Error("FIREBASE_API_KEY_MISSING");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
      cache: "no-store",
    },
  );

  if (!response.ok) return null;

  const payload = (await response.json().catch(() => null)) as
    | { users?: Array<{ localId?: string; email?: string }> }
    | null;

  return payload?.users?.[0] ?? null;
}

async function marketIntelligencePost(request: Request) {
  const started = Date.now();

  try {
    const identity = await verifyFirebaseBearer(request);

    if (!identity) {
      return Response.json(
        { error: "AUTH_REQUIRED", message: "Sign in to run Market Intelligence." },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => null)) as
      | { analysis?: Record<string, unknown> }
      | null;

    if (!body?.analysis) {
      return Response.json(
        {
          error: "ANALYSIS_REQUIRED",
          message: "Run a fresh AskSAV analysis first.",
        },
        { status: 400 },
      );
    }

    console.info("[AskSAV market] on-demand market intelligence started", {
      uid: identity.localId,
    });

    const market = await generateAskSavOnDemandMarket(
      body.analysis as Record<string, any>,
    );

    const elapsedMs = Date.now() - started;

    console.info(
      `[AskSAV market] on-demand market intelligence completed in ${elapsedMs}ms`,
    );

    return Response.json({ market, elapsedMs });
  } catch (error) {
    console.error("[AskSAV market] on-demand market intelligence failed", error);

    return Response.json(
      {
        error: "MARKET_INTELLIGENCE_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Unable to generate Market Intelligence.",
      },
      { status: 500 },
    );
  }
}
export async function POST(request: Request) {
  try {
    const identity=await verifyFirebaseRequest(request);
    const state=await getAskSAVAccountState(identity);
    if(!state.entitlements.fullMarketEvidence) return Response.json({
      error:"Market Intelligence is available with AskSAV Plus and AskSAV Pro.",
      code:"MARKET_INTELLIGENCE_UPGRADE_REQUIRED", plan:state.plan
    },{status:403});
    return marketIntelligencePost(request);
  } catch(error) {
    const m=error instanceof Error?error.message:"UNKNOWN";
    if(m==="AUTH_REQUIRED"||m==="AUTH_INVALID") return Response.json({error:"Sign in is required to run Market Intelligence."},{status:401});
    throw error;
  }
}
