import { NextResponse } from "next/server";
import {
  getAskSAVInternalAnalysisKey,
  releaseAskSAVAnalysis,
  reserveAskSAVAnalysis,
  verifyFirebaseRequest,
} from "../../../../lib/v20-entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  let identity: { uid: string; email: string | null } | null = null;
  let reservedPeriod: string | null = null;

  try {
    identity = await verifyFirebaseRequest(request);
    const reservation = await reserveAskSAVAnalysis(identity);

    if (!reservation.allowed) {
      return NextResponse.json(
        {
          error: `You've used all ${reservation.state.usage.analysesLimit} analyses available on your ${reservation.state.plan === "FREE" ? "Free" : reservation.state.plan} plan this month.`,
          code: "ANALYSIS_LIMIT_REACHED",
          ...reservation.state,
        },
        { status: 429 }
      );
    }

    reservedPeriod = reservation.state.usage.periodKey;
    const internalKey = getAskSAVInternalAnalysisKey();
    if (!internalKey) {
      throw new Error("INTERNAL_ANALYSIS_KEY_MISSING");
    }

    const formData = await request.formData();
    const upstream = await fetch(new URL("/api/analyse-item", request.url), {
      method: "POST",
      headers: {
        "x-asksav-v20-internal": internalKey,
      },
      body: formData,
      cache: "no-store",
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      await releaseAskSAVAnalysis(identity, reservedPeriod);
      return new Response(text, {
        status: upstream.status,
        headers: {
          "content-type": upstream.headers.get("content-type") || "application/json",
          "cache-control": "no-store",
        },
      });
    }

    let payload: any;
    try {
      payload = JSON.parse(text);
    } catch {
      await releaseAskSAVAnalysis(identity, reservedPeriod);
      throw new Error("ANALYSIS_RESPONSE_NOT_JSON");
    }

    // Feature gating is server controlled. Free accounts keep the core valuation
    // but do not receive the full comparable-listing evidence payload.
    if (!reservation.state.entitlements.fullMarketEvidence) {
      delete payload.market_evidence;
    }

    payload._asksav = {
      plan: reservation.state.plan,
      entitlements: reservation.state.entitlements,
      usage: reservation.state.usage,
    };

    return NextResponse.json(payload, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";

    if (identity && reservedPeriod) {
      try {
        await releaseAskSAVAnalysis(identity, reservedPeriod);
      } catch (releaseError) {
        console.error("[AskSAV v0.20] usage reservation release failed", releaseError);
      }
    }

    if (message === "AUTH_REQUIRED" || message === "AUTH_INVALID") {
      return NextResponse.json({ error: "Sign in is required to analyse an item." }, { status: 401 });
    }

    console.error("[AskSAV v0.20] protected analysis failed", error);
    return NextResponse.json(
      { error: "AskSAV could not start the protected analysis request." },
      { status: 500 }
    );
  }
}
