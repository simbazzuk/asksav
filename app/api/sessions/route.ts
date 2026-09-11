import { NextRequest, NextResponse } from "next/server";
import { createInspectionSession } from "../../../lib/session-data";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const propertyId = String(body.propertyId ?? body.property_id ?? "").trim();
    const inspectionType = String(
      body.inspectionType ?? body.inspection_type ?? "ROUTINE"
    ).trim();

    const totalItems = Number(body.totalItems ?? body.total_items ?? 0);

    if (!propertyId) {
      return NextResponse.json(
        { error: "propertyId is required" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(totalItems) || totalItems <= 0) {
      return NextResponse.json(
        {
          error:
            "This property has no inspection items configured. Configure at least one room or asset before starting an inspection.",
        },
        { status: 400 }
      );
    }

    const session = await createInspectionSession({
      propertyId,
      inspectionType,
      totalItems,
    });

    return NextResponse.json({
      ...session,
      // Compatibility alias for older inspection clients.
      sessionId: session.session_id,
    });
  } catch (error) {
    console.error("[AskSAV] Create inspection session failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create inspection session",
      },
      { status: 500 }
    );
  }
}
