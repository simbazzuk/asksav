SELECT
  property_id,
  asset,
  created_at,
  visual_change_type,
  current_condition,
  defect_detected,
  defect_type,
  severity,
  consensus_status,
  agreement_score
FROM `siteface-dev.siteface.inspections`
ORDER BY property_id, asset, created_at DESC;
