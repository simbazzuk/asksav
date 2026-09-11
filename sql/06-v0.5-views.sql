CREATE OR REPLACE VIEW `siteface-dev.siteface.latest_asset_condition` AS
SELECT *
FROM `siteface-dev.siteface.inspections`
QUALIFY ROW_NUMBER() OVER (
  PARTITION BY property_id, asset
  ORDER BY created_at DESC
) = 1;

CREATE OR REPLACE VIEW `siteface-dev.siteface.property_summary` AS
SELECT
  property_id,
  COUNT(*) AS tracked_assets,
  COUNTIF(defect_detected) AS active_defects,
  COUNTIF(current_condition = 'POOR') AS poor_assets,
  COUNTIF(consensus_status = 'DISAGREEMENT') AS needs_review,
  MAX(created_at) AS last_inspection
FROM `siteface-dev.siteface.latest_asset_condition`
GROUP BY property_id;
