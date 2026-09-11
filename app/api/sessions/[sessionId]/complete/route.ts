import { NextRequest, NextResponse } from "next/server";
import { completeSession } from "../../../../../lib/session-data";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params;
    const body = await request.json();

    const signedOffBy = String(body.signedOffBy ?? "").trim();
    const notes = String(body.notes ?? "").trim();

    if (!signedOffBy) {
      return NextResponse.json(
        { error: "Inspector name is required to sign off the inspection." },
        { status: 400 }
      );
    }

    const result = await completeSession(sessionId, signedOffBy, notes);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[AskSAV] Session completion failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to complete inspection",
      },
      { status: 500 }
    );
  }
}
