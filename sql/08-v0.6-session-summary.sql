CREATE OR REPLACE VIEW `siteface-dev.siteface.inspection_session_summary` AS
SELECT
  property_id,
  DATE(created_at) AS inspection_date,
  COUNT(*) AS captured_assets,
  COUNTIF(defect_detected) AS findings,
  COUNTIF(severity IN ('HIGH', 'CRITICAL')) AS high_priority_findings,
  COUNTIF(consensus_status = 'DISAGREEMENT') AS needs_review,
  AVG(confidence) AS average_confidence,
  MAX(created_at) AS latest_capture
FROM `siteface-dev.siteface.inspections`
GROUP BY property_id, DATE(created_at);
