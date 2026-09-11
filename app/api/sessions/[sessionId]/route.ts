import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/session-data";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  try {
    const session = await getSession(sessionId);

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load session." },
      { status: 500 }
    );
  }
}
