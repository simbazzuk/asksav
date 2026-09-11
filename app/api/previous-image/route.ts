import { NextResponse } from "next/server";
import { getPreviousImageForCapture } from "../../../lib/previous";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const propertyId = String(searchParams.get("propertyId") || "").trim();
    const asset = String(searchParams.get("asset") || "").trim();

    if (!propertyId || !asset) {
      return NextResponse.json(
        { error: "propertyId and asset are required." },
        { status: 400 }
      );
    }

    const result = await getPreviousImageForCapture(propertyId, asset);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load previous image.",
      },
      { status: 500 }
    );
  }
}
