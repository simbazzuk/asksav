import { randomUUID } from "crypto";
import { bigquery, dataset, location } from "./google";
import { toPlainRow } from "./bigquery-plain";

export async function createInspectionSession(input: {
  propertyId: string;
  inspectionType?: string;
  totalItems?: number;
}) {
  const sessionId = randomUUID();
  const now = new Date().toISOString();

  await bigquery.dataset(dataset).table("inspection_sessions").insert([
    {
      session_id: sessionId,
      property_id: input.propertyId,
      inspection_type: input.inspectionType ?? "ROUTINE",
      status: "IN_PROGRESS",
      total_items: input.totalItems ?? 0,
      completed_items: 0,
      started_at: now,
      completed_at: null,
      created_at: now,
      signed_off_by: null,
      sign_off_notes: null,
      signed_off_at: null,
    },
  ]);

  await bigquery.dataset(dataset).table("session_events").insert([
    {
      event_id: randomUUID(),
      session_id: sessionId,
      event_type: "CREATED",
      status: "IN_PROGRESS",
      signed_off_by: null,
      notes: null,
      created_at: now,
    },
  ]);

  return {
    session_id: sessionId,
    property_id: input.propertyId,
    inspection_type: input.inspectionType ?? "ROUTINE",
    status: "IN_PROGRESS",
    total_items: input.totalItems ?? 0,
    completed_items: 0,
    started_at: now,
  };
}

export async function getSession(sessionId: string) {
  const [rows] = await bigquery.query({
    query: `
      SELECT
        s.*,
        p.property_name,
        p.address_line1,
        p.address_line2,
        p.city,
        p.postcode,
        p.property_type
      FROM \`siteface-dev.siteface.inspection_sessions_current\` s
      LEFT JOIN \`siteface-dev.siteface.properties\` p
        ON p.property_id = s.property_id
      WHERE s.session_id = @sessionId
      LIMIT 1
    `,
    params: { sessionId },
    location,
  });

  return rows.length ? toPlainRow(rows[0]) : null;
}

/**
 * v0.9.4:
 * Progress is derived from inspections.session_id in inspection_sessions_current.
 * No UPDATE is required, avoiding BigQuery streaming-buffer DML restrictions.
 */
export async function updateSessionProgress(sessionId: string) {
  return getSession(sessionId);
}

export async function completeSession(
  sessionId: string,
  signedOffBy: string,
  notes?: string
) {
  const session = await getSession(sessionId);

  if (!session) {
    throw new Error("Inspection session not found");
  }

  if ((session.completed_items ?? 0) < (session.total_items ?? 0)) {
    throw new Error(
      `Inspection is not complete. ${session.completed_items ?? 0} of ${
        session.total_items ?? 0
      } items have been inspected.`
    );
  }

  const now = new Date().toISOString();

  await bigquery.dataset(dataset).table("session_events").insert([
    {
      event_id: randomUUID(),
      session_id: sessionId,
      event_type: "SIGNED_OFF",
      status: "COMPLETED",
      signed_off_by: signedOffBy,
      notes: notes || null,
      created_at: now,
    },
  ]);

  return {
    session_id: sessionId,
    status: "COMPLETED",
    signed_off_by: signedOffBy,
    sign_off_notes: notes || null,
    signed_off_at: now,
  };
}
