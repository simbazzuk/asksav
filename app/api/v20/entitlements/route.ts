import { NextResponse } from "next/server";
import { getAskSAVAccountState, verifyFirebaseRequest } from "../../../../lib/v20-entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const identity = await verifyFirebaseRequest(request);
    const state = await getAskSAVAccountState(identity);
    return NextResponse.json(state, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "AUTH_REQUIRED" || message === "AUTH_INVALID") {
      return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
    }

    console.error("[AskSAV v0.20] entitlement lookup failed", error);
    return NextResponse.json(
      { error: "Could not load plan and usage information." },
      { status: 500 }
    );
  }
}
