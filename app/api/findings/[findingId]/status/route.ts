import { NextRequest, NextResponse } from "next/server";
import { updateFindingStatus } from "../../../../../lib/finding-data";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ findingId: string }> }
) {
  try {
    const { findingId } = await context.params;
    const body = await request.json();

    const status = String(body.status ?? "").toUpperCase();
    const resolutionNotes =
      typeof body.resolutionNotes === "string" ? body.resolutionNotes : "";

    if (!["OPEN", "ACKNOWLEDGED", "RESOLVED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid finding status" },
        { status: 400 }
      );
    }

    const result = await updateFindingStatus(
      findingId,
      status,
      resolutionNotes
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[AskSAV] Finding status update failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update finding",
      },
      { status: 500 }
    );
  }
}
