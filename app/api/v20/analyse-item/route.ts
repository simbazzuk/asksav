import { NextResponse } from "next/server";
import {
  getAskSAVInternalAnalysisKey,
  releaseAskSAVAnalysis,
  reserveAskSAVAnalysis,
  verifyFirebaseRequest,
} from "../../../../lib/v20-entitlements";

import { AskSavTimeoutError, withAskSavTimeout } from "../../../../lib/asksav-timeout";
async function askSavStage<T>(
  stage: string,
  work: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  console.info(`[AskSAV stage] ${stage} started`);

  try {
    const result = await work();
    console.info(
      `[AskSAV stage] ${stage} completed in ${Date.now() - started}ms`,
    );
    return result;
  } catch (error) {
    console.error(
      `[AskSAV stage] ${stage} failed after ${Date.now() - started}ms`,
      error,
    );
    throw error;
  }
}
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function protectedAnalysisPost(request: Request) {
  console.info("[AskSAV stage] protected-handler entered");
  let identity: { uid: string; email: string | null } | null = null;
  let reservedPeriod: string | null = null;

  try {
    identity = await verifyFirebaseRequest(request);

    if (!identity) {
      throw new Error("AUTH_REQUIRED");
    }

    const authenticatedIdentity = identity;
    const reservation = await askSavStage(
      "entitlement/reserveAskSAVAnalysis",
      async () => reserveAskSAVAnalysis(authenticatedIdentity),
    );

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

    const reservationPeriod = reservation.state.usage.periodKey;
    reservedPeriod = reservationPeriod;
    const internalKey = getAskSAVInternalAnalysisKey();
    if (!internalKey) {
      throw new Error("INTERNAL_ANALYSIS_KEY_MISSING");
    }

    const formData = await request.formData();
    const upstream = await askSavStage("upstream/analyse-item", async () => fetch(new URL("/api/analyse-item", request.url), {
      method: "POST",
      headers: {
        "x-asksav-v20-internal": internalKey,
      },
      body: formData,
      cache: "no-store",
    }));

    const text = await upstream.text();

    if (!upstream.ok) {
      await askSavStage(
        "persistence/releaseAskSAVAnalysis",
        async () => releaseAskSAVAnalysis(authenticatedIdentity, reservationPeriod),
      );
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
      await askSavStage(
        "persistence/releaseAskSAVAnalysis",
        async () => releaseAskSAVAnalysis(authenticatedIdentity, reservationPeriod),
      );
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
      const identityToRelease = identity;
      const periodToRelease = reservedPeriod;

      try {
        await askSavStage(
          "persistence/releaseAskSAVAnalysis",
          async () => releaseAskSAVAnalysis(identityToRelease, periodToRelease),
        );
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

const ASKSAV_PROTECTED_ANALYSIS_TIMEOUT_MS = 105_000;

export async function POST(request: Request) {
  const requestId =
    request.headers.get("x-vercel-id") ||
    request.headers.get("x-request-id") ||
    crypto.randomUUID();

  const started = Date.now();

  console.info(
    `[AskSAV v0.20.2.6] request started id=${requestId}`,
  );

  try {
    const response = await withAskSavTimeout(
      "protected-analysis",
      () => protectedAnalysisPost(request),
      ASKSAV_PROTECTED_ANALYSIS_TIMEOUT_MS,
    );

    console.info(
      `[AskSAV v0.20.2.6] request completed id=${requestId} totalMs=${Date.now() - started}`,
    );

    return response;
  } catch (error) {
    const totalMs = Date.now() - started;

    if (error instanceof AskSavTimeoutError) {
      console.error(
        `[AskSAV v0.20.2.6] controlled timeout id=${requestId} stage=${error.stage} totalMs=${totalMs}`,
      );

      return Response.json(
        {
          error: "ANALYSIS_TIMEOUT",
          message:
            "AskSAV is taking longer than expected. Please try again with a clearer or closer image.",
          retryable: true,
          requestId,
        },
        { status: 504 },
      );
    }

    console.error(
      `[AskSAV v0.20.2.6] protected analysis failed id=${requestId} totalMs=${totalMs}`,
      error,
    );

    throw error;
  }
}
