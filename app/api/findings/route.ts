import { NextResponse } from "next/server";
import { listFindings } from "../../../lib/finding-data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    return NextResponse.json(await listFindings(status));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load findings." },
      { status: 500 }
    );
  }
}
