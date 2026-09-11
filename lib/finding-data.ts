import { randomUUID } from "crypto";
import { bigquery, dataset } from "./google";

function unwrapValue(value: any) {
  if (value && typeof value === "object" && "value" in value) {
    return value.value;
  }
  return value;
}

function plainRow(row: any) {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(row ?? {})) {
    out[key] = unwrapValue(value);
  }
  return out;
}

export async function createFindingFromInspection(inspection: any) {
  const findingId = randomUUID();
  const now = new Date().toISOString();

  const row = {
    finding_id: findingId,
    inspection_id: inspection.inspection_id,
    session_id: inspection.session_id ?? null,
    property_id: inspection.property_id,
    room_id: inspection.room_id ?? null,
    room_name: inspection.room_name ?? null,
    asset_id: inspection.asset_id ?? null,
    asset_name: inspection.asset_name ?? inspection.asset ?? null,
    defect_type: inspection.defect_type ?? "OTHER",
    severity: inspection.severity ?? "LOW",
    confidence: inspection.confidence ?? null,
    status: "OPEN",
    title: `${inspection.room_name ?? "Area"} - ${inspection.asset_name ?? inspection.asset ?? "Asset"}: ${String(
      inspection.defect_type ?? "Finding"
    ).replaceAll("_", " ")}`,
    description: inspection.summary ?? inspection.change_description ?? "SiteFace finding",
    recommended_action: inspection.recommended_action ?? null,
    acknowledged_at: null,
    resolved_at: null,
    resolution_notes: null,
    created_at: now,
    updated_at: now,
  };

  await bigquery.dataset(dataset).table("findings").insert([row]);

  await bigquery.dataset(dataset).table("finding_events").insert([
    {
      event_id: randomUUID(),
      finding_id: findingId,
      event_type: "CREATED",
      status: "OPEN",
      notes: null,
      created_at: now,
    },
  ]);

  return findingId;
}

export async function listFindings(status?: string) {
  const params: Record<string, any> = {};
  let where = "";

  if (status && status !== "ALL") {
    where = "WHERE f.status = @status";
    params.status = status;
  }

  const [rows] = await bigquery.query({
    query: `
      SELECT
        f.*,
        p.property_name,
        p.address_line1,
        p.city,
        p.postcode
      FROM \`siteface-dev.siteface.findings_current\` f
      LEFT JOIN \`siteface-dev.siteface.properties\` p
        ON p.property_id = f.property_id
      ${where}
      ORDER BY COALESCE(f.latest_event_at, f.created_at) DESC
    `,
    params,
    location: "europe-west2",
  });

  return rows.map(plainRow);
}

export async function getFinding(findingId: string) {
  const [rows] = await bigquery.query({
    query: `
      SELECT
        f.*,
        i.before_uri,
        i.after_uri,
        i.visual_change_type,
        i.change_description,
        i.current_condition,
        i.comparison_quality,
        i.consensus_status,
        i.agreement_score,
        p.property_name,
        p.address_line1,
        p.address_line2,
        p.city,
        p.postcode
      FROM \`siteface-dev.siteface.findings_current\` f
      LEFT JOIN \`siteface-dev.siteface.inspections\` i
        ON i.inspection_id = f.inspection_id
      LEFT JOIN \`siteface-dev.siteface.properties\` p
        ON p.property_id = f.property_id
      WHERE f.finding_id = @findingId
      LIMIT 1
    `,
    params: { findingId },
    location: "europe-west2",
  });

  if (!rows.length) return null;
  return plainRow(rows[0]);
}

export async function updateFindingStatus(
  findingId: string,
  status: string,
  resolutionNotes?: string
) {
  const allowed = new Set(["OPEN", "ACKNOWLEDGED", "RESOLVED"]);
  if (!allowed.has(status)) {
    throw new Error(`Unsupported finding status: ${status}`);
  }

  let eventType = "STATUS_CHANGED";
  if (status === "ACKNOWLEDGED") eventType = "ACKNOWLEDGED";
  if (status === "RESOLVED") eventType = "RESOLVED";
  if (status === "OPEN") eventType = "REOPENED";

  await bigquery.dataset(dataset).table("finding_events").insert([
    {
      event_id: randomUUID(),
      finding_id: findingId,
      event_type: eventType,
      status,
      notes: resolutionNotes || null,
      created_at: new Date().toISOString(),
    },
  ]);

  return { finding_id: findingId, status };
}
