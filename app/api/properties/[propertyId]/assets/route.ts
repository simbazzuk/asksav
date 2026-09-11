import { NextResponse } from "next/server";
import { addAsset, getPropertyAssets } from "../../../../../lib/property-data";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await params;

  try {
    return NextResponse.json(await getPropertyAssets(propertyId));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load assets." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await params;

  try {
    const body = await request.json();

    if (!body.roomName || !body.assetName) {
      return NextResponse.json(
        { error: "Room name and asset name are required." },
        { status: 400 }
      );
    }

    const assetId = await addAsset({
      propertyId,
      roomName: body.roomName,
      assetName: body.assetName,
    });

    return NextResponse.json({ assetId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not add asset." },
      { status: 500 }
    );
  }
}
