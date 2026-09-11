CREATE OR REPLACE VIEW `siteface-dev.siteface.session_summary` AS
SELECT
  s.session_id,
  s.property_id,
  p.property_name,
  p.address_line1,
  p.city,
  p.postcode,
  s.inspection_type,
  s.status,
  s.total_items,
  s.completed_items,
  SAFE_DIVIDE(s.completed_items, s.total_items) AS completion_ratio,
  s.started_at,
  s.completed_at
FROM `siteface-dev.siteface.inspection_sessions` s
LEFT JOIN `siteface-dev.siteface.properties` p
USING (property_id);
