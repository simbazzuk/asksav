CREATE OR REPLACE VIEW `siteface-dev.siteface.open_findings` AS
SELECT *
FROM `siteface-dev.siteface.findings`
WHERE status IN ('OPEN', 'ACKNOWLEDGED');

CREATE OR REPLACE VIEW `siteface-dev.siteface.session_report_summary` AS
SELECT
  s.session_id,
  s.property_id,
  p.property_name,
  p.address_line1,
  p.address_line2,
  p.city,
  p.postcode,
  p.property_type,
  s.inspection_type,
  s.status,
  s.total_items,
  s.completed_items,
  s.started_at,
  s.completed_at,
  s.signed_off_by,
  s.sign_off_notes,
  s.signed_off_at,
  COUNTIF(i.defect_detected) AS detected_findings,
  COUNTIF(i.severity IN ('HIGH','CRITICAL')) AS high_priority_findings,
  AVG(i.confidence) AS average_confidence
FROM `siteface-dev.siteface.inspection_sessions` s
LEFT JOIN `siteface-dev.siteface.properties` p USING (property_id)
LEFT JOIN `siteface-dev.siteface.inspections` i USING (session_id)
GROUP BY
  s.session_id, s.property_id,
  p.property_name, p.address_line1, p.address_line2,
  p.city, p.postcode, p.property_type,
  s.inspection_type, s.status, s.total_items, s.completed_items,
  s.started_at, s.completed_at, s.signed_off_by,
  s.sign_off_notes, s.signed_off_at;
