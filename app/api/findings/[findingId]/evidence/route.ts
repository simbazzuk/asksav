import { NextRequest, NextResponse } from "next/server";
import { getFinding } from "../../../../../lib/finding-data";

function encodeUri(uri?: string | null) {
  if (!uri) return null;
  return `/api/evidence-image?uri=${encodeURIComponent(uri)}`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ findingId: string }> }
) {
  try {
    const { findingId } = await context.params;

    const finding = await getFinding(findingId);

    if (!finding) {
      return NextResponse.json(
        { error: "Finding not found" },
        { status: 404 }
      );
    }

    const beforeUrl = encodeUri(finding.before_uri);
    const afterUrl = encodeUri(finding.after_uri);

    return NextResponse.json({
      // Current API naming
      before_url: beforeUrl,
      after_url: afterUrl,

      // Client compatibility naming
      beforeUrl,
      afterUrl,

      // Original GCS references
      before_uri: finding.before_uri ?? null,
      after_uri: finding.after_uri ?? null,
      beforeUri: finding.before_uri ?? null,
      afterUri: finding.after_uri ?? null,
    });
  } catch (error) {
    console.error("[AskSAV] Evidence API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load evidence images",
      },
      { status: 500 }
    );
  }
}

