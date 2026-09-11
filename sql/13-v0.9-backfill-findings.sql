INSERT INTO `siteface-dev.siteface.findings` (
  finding_id,
  inspection_id,
  session_id,
  property_id,
  room_id,
  room_name,
  asset_id,
  asset_name,
  defect_type,
  severity,
  confidence,
  status,
  title,
  description,
  recommended_action,
  created_at,
  updated_at
)
SELECT
  GENERATE_UUID(),
  i.inspection_id,
  i.session_id,
  i.property_id,
  i.room_id,
  i.room_name,
  i.asset_id,
  i.asset_name,
  i.defect_type,
  i.severity,
  i.confidence,
  'OPEN',
  CONCAT(
    COALESCE(i.room_name, 'Property'),
    ' - ',
    COALESCE(i.asset_name, i.asset, 'Asset'),
    ': ',
    REPLACE(COALESCE(i.defect_type, 'Finding'), '_', ' ')
  ),
  i.summary,
  i.recommended_action,
  i.created_at,
  CURRENT_TIMESTAMP()
FROM `siteface-dev.siteface.inspections` i
LEFT JOIN `siteface-dev.siteface.findings` f
  ON i.inspection_id = f.inspection_id
WHERE i.defect_detected = TRUE
  AND f.inspection_id IS NULL;
