import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { bigquery, dataset, location, projectId } from "../../../../lib/google";

export const runtime = "nodejs";

export async function POST() {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Demo finding creation is disabled in production." }, { status: 403 });
    }

    const [inspections] = await bigquery.query({
      query: `
        SELECT inspection_id, property_id, room_id, room_name, asset_id, asset_name, asset
        FROM \`${projectId}.${dataset}.inspections\`
        ORDER BY created_at DESC
        LIMIT 1
      `,
      location,
    });

    const latest = inspections[0] || {};
    const findingId = randomUUID();
    const now = new Date().toISOString();
    const propertyId = latest.property_id || "PROP001";
    const roomName = latest.room_name || "Demo room";
    const assetName = latest.asset_name || latest.asset || "Wall";

    await bigquery.dataset(dataset).table("findings").insert([{
      finding_id: findingId,
      inspection_id: latest.inspection_id || `DEMO-${randomUUID()}`,
      session_id: null,
      property_id: propertyId,
      room_id: latest.room_id || null,
      room_name: roomName,
      asset_id: latest.asset_id || null,
      asset_name: assetName,
      defect_type: "SURFACE_DAMAGE",
      severity: "MODERATE",
      confidence: 0.93,
      status: "OPEN",
      title: `${roomName} - ${assetName}: Surface damage`,
      description: "Demo finding created to validate the AskSAV findings workflow.",
      recommended_action: "Review the affected area and arrange repair if confirmed during inspection.",
      acknowledged_at: null,
      resolved_at: null,
      resolution_notes: null,
      created_at: now,
      updated_at: now,
    }]);

    return NextResponse.json({ finding_id: findingId });
  } catch (error) {
    console.error("[AskSAV] demo finding creation failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create demo finding." },
      { status: 500 }
    );
  }
}
