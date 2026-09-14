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
export async function POST(request: Request) {
  console.info("[AskSAV analysis] handler entered");
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
    const marketEvidence = await askSavInnerStage("vision/generateMarketComparables", async () => generateMarketComparables(result as Record<string, any>));

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
