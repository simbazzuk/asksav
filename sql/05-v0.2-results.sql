SELECT
  created_at,
  property_id,
  asset,
  visual_change_type,
  defect_detected,
  defect_type,
  condition_direction,
  severity,
  confidence,
  comparison_quality,
  change_description,
  summary,
  recommended_action
FROM `siteface-dev.siteface.inspections`
ORDER BY created_at DESC
LIMIT 50;
