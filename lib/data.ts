import { bigquery, dataset, location, projectId } from "./google";

export async function getDashboard() {
  const query = `
    WITH latest AS (
      SELECT *
      FROM \`${projectId}.${dataset}.inspections\`
      QUALIFY ROW_NUMBER() OVER (
        PARTITION BY property_id, asset
        ORDER BY created_at DESC
      ) = 1
    )
    SELECT
      COUNT(DISTINCT property_id) AS properties,
      COUNT(*) AS tracked_assets,
      COUNTIF(defect_detected) AS active_defects,
      COUNTIF(consensus_status = 'DISAGREEMENT') AS needs_review,
      COUNTIF(current_condition = 'POOR') AS poor_assets,
      COUNTIF(current_condition = 'ATTENTION') AS attention_assets
    FROM latest
  `;
  const [rows] = await bigquery.query({ query, location });
  return rows[0] || {};
}

export async function getProperties() {
  const query = `
    WITH ranked AS (
      SELECT
        property_id,
        asset,
        current_condition,
        defect_detected,
        severity,
        created_at,
        ROW_NUMBER() OVER (
          PARTITION BY property_id, asset
          ORDER BY created_at DESC
        ) AS rn
      FROM \`${projectId}.${dataset}.inspections\`
    )
    SELECT
      property_id,
      COUNTIF(rn = 1) AS assets,
      COUNTIF(rn = 1 AND defect_detected) AS active_defects,
      COUNTIF(rn = 1 AND current_condition = 'ATTENTION') AS attention_assets,
      COUNTIF(rn = 1 AND current_condition = 'POOR') AS poor_assets,
      MAX(created_at) AS last_inspection
    FROM ranked
    GROUP BY property_id
    ORDER BY last_inspection DESC
  `;
  const [rows] = await bigquery.query({ query, location });
  return rows;
}

export async function getProperty(propertyId: string) {
  const query = `
    WITH latest AS (
      SELECT *
      FROM \`${projectId}.${dataset}.inspections\`
      WHERE property_id = @property_id
      QUALIFY ROW_NUMBER() OVER (
        PARTITION BY asset
        ORDER BY created_at DESC
      ) = 1
    )
    SELECT *
    FROM latest
    ORDER BY asset
  `;
  const [rows] = await bigquery.query({
    query,
    location,
    params: { property_id: propertyId },
  });
  return rows;
}

export async function getFindings(limit = 100) {
  const query = `
    WITH latest AS (
      SELECT *
      FROM \`${projectId}.${dataset}.inspections\`
      QUALIFY ROW_NUMBER() OVER (
        PARTITION BY property_id, asset
        ORDER BY created_at DESC
      ) = 1
    )
    SELECT
      inspection_id,
      property_id,
      asset,
      current_condition,
      defect_detected,
      defect_type,
      severity,
      confidence,
      summary,
      recommended_action,
      created_at
    FROM latest
    WHERE defect_detected
       OR current_condition IN ('ATTENTION','POOR')
       OR consensus_status = 'DISAGREEMENT'
    ORDER BY
      CASE severity
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MODERATE' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5
      END,
      created_at DESC
    LIMIT @limit
  `;
  const [rows] = await bigquery.query({
    query,
    location,
    params: { limit },
  });
  return rows;
}

export async function getHistory(limit = 100) {
  const query = `
    SELECT
      inspection_id,
      property_id,
      asset,
      visual_change_type,
      current_condition,
      defect_detected,
      defect_type,
      severity,
      consensus_status,
      agreement_score,
      confidence,
      created_at
    FROM \`${projectId}.${dataset}.inspections\`
    ORDER BY created_at DESC
    LIMIT @limit
  `;
  const [rows] = await bigquery.query({
    query,
    location,
    params: { limit },
  });
  return rows;
}

export async function getRecentInspections(limit = 8) {
  const query = `
    SELECT
      inspection_id,
      property_id,
      asset,
      current_condition,
      defect_detected,
      defect_type,
      severity,
      consensus_status,
      created_at
    FROM \`${projectId}.${dataset}.inspections\`
    ORDER BY created_at DESC
    LIMIT @limit
  `;
  const [rows] = await bigquery.query({
    query,
    location,
    params: { limit },
  });
  return rows;
}
