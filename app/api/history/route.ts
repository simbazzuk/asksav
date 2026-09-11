import { NextResponse } from "next/server";
import { getHistory } from "../../../lib/data";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await getHistory(100);
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load history." },
      { status: 500 }
    );
  }
}
