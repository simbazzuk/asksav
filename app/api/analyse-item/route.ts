import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { analyseItemPhoto } from "../../../lib/item-intelligence";

import { generateMarketComparables } from "../../../lib/market-comparables";
export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function askSavInnerStage<T>(
  stage: string,
  work: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  console.info(`[AskSAV analysis] ${stage} started`);

  try {
    const result = await work();
    console.info(
      `[AskSAV analysis] ${stage} completed in ${Date.now() - started}ms`,
    );
    return result;
  } catch (error) {
    console.error(
      `[AskSAV analysis] ${stage} failed after ${Date.now() - started}ms`,
      error,
    );
    throw error;
  }
}

async function askSavOptionalStage<T>(
  stage: string,
  work: () => Promise<T>,
  timeoutMs: number,
  enabled = true,
): Promise<T> {
  if (!enabled) {
    console.info(`[AskSAV optional] ${stage} skipped by entitlement`);
    return null as T;
  }

  const started = Date.now();
  console.info(`[AskSAV optional] ${stage} started budget=${timeoutMs}ms`);

  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error(`${stage} timed out after ${timeoutMs}ms`);
        error.name = "AskSavOptionalStageTimeout";
        reject(error);
      }, timeoutMs);
    });

    const result = await Promise.race([work(), timeout]);

    console.info(
      `[AskSAV optional] ${stage} completed in ${Date.now() - started}ms`,
    );

    return result;
  } catch (error) {
    const elapsed = Date.now() - started;
    const timedOut =
      error instanceof Error && error.name === "AskSavOptionalStageTimeout";

    console.warn(
      `[AskSAV optional] ${stage} ${timedOut ? "timed out" : "failed"} after ${elapsed}ms; continuing without market comparables`,
      error,
    );

    return null as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
export async function analyseItemHandler(request: Request) {
  console.info("[AskSAV analysis] handler entered");
  const askSavFullMarketEvidence = request.headers.get("x-asksav-full-market-evidence") === "true";
  console.info(`[AskSAV analysis] full-market-evidence=${askSavFullMarketEvidence}`);
  // ASKSAV_V020_INTERNAL_GUARD
  const __askSAVMaterial =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64 ||
    process.env.GOOGLE_PRIVATE_KEY ||
    process.env.ASKSAV_INTERNAL_API_KEY ||
    "";
  const __askSAVExpectedKey = __askSAVMaterial
    ? createHash("sha256").update("asksav-v0.20:" + __askSAVMaterial).digest("hex")
    : "";
  if (
    !__askSAVExpectedKey ||
    request.headers.get("x-asksav-v20-internal") !== __askSAVExpectedKey
  ) {
    return Response.json(
      { error: "Protected analysis endpoint. Use the authenticated AskSAV analysis flow." },
      { status: 403 }
    );
  }
  try {
    const form = await request.formData();
    const image = form.get("image");
    const hint = String(form.get("hint") || "").trim();

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "An image is required." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(image.type)) {
      return NextResponse.json({ error: "Use a JPEG, PNG or WebP image." }, { status: 400 });
    }

    if (image.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Image must be 10MB or smaller." }, { status: 400 });
    }

    const result = await askSavInnerStage("vision/analyseItemPhoto", async () => analyseItemPhoto(image, hint));
    const marketEvidence = await askSavOptionalStage("market-comparables/generateMarketComparables", async () => generateMarketComparables(result as Record<string, any>), 15000, askSavFullMarketEvidence);

    return NextResponse.json({
      ...result,
      market_evidence: marketEvidence,
    });
  } catch (error) {
    console.error("[AskSAV] item analysis failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not analyse item." },
      { status: 500 }
    );
  }
}
/**
 * Next.js route entrypoint.
 * The protected v0.20 route calls analyseItemHandler directly so that
 * production analysis does not make an HTTP request back into the same
 * Vercel deployment.
 */
export async function POST(request: Request) {
  return analyseItemHandler(request);
}
