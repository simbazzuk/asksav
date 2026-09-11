import { NextResponse } from "next/server";
import { createProperty, listProperties } from "../../../lib/property-data";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await listProperties());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load properties." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.propertyName || !body.addressLine1 || !body.city || !body.postcode) {
      return NextResponse.json(
        { error: "Name, address, city and postcode are required." },
        { status: 400 }
      );
    }

    const propertyId = await createProperty(body);
    return NextResponse.json({ propertyId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create property." },
      { status: 500 }
    );
  }
}
