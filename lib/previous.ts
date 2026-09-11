import { bigquery, bucketName, dataset, location, projectId } from "./google";

export async function getPreviousImageForCapture(
  propertyId: string,
  asset: string
) {
  const query = `
    SELECT
      after_uri,
      current_condition,
      defect_detected,
      defect_type,
      severity,
      created_at
    FROM \`${projectId}.${dataset}.inspections\`
    WHERE property_id = @property_id
      AND asset = @asset
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const [rows] = await bigquery.query({
    query,
    location,
    params: {
      property_id: propertyId,
      asset,
    },
  });

  if (!rows.length) {
    return {
      exists: false,
    };
  }

  const row: any = rows[0];
  const uri = String(row.after_uri || "");

  return {
    exists: true,
    previewUrl: uri
      ? `/api/evidence-image?uri=${encodeURIComponent(uri)}`
      : null,
    current_condition: row.current_condition,
    defect_detected: row.defect_detected,
    defect_type: row.defect_type,
    severity: row.severity,
    created_at: row.created_at?.value || String(row.created_at || ""),
  };
}
