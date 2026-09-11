CREATE TABLE IF NOT EXISTS `siteface-dev.siteface.findings` (
  finding_id STRING NOT NULL,
  inspection_id STRING NOT NULL,
  session_id STRING,
  property_id STRING NOT NULL,
  room_id STRING,
  room_name STRING,
  asset_id STRING,
  asset_name STRING,
  defect_type STRING,
  severity STRING,
  confidence FLOAT64,
  status STRING,
  title STRING,
  description STRING,
  recommended_action STRING,
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution_notes STRING,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

ALTER TABLE `siteface-dev.siteface.inspection_sessions`
ADD COLUMN IF NOT EXISTS signed_off_by STRING;

ALTER TABLE `siteface-dev.siteface.inspection_sessions`
ADD COLUMN IF NOT EXISTS sign_off_notes STRING;

ALTER TABLE `siteface-dev.siteface.inspection_sessions`
ADD COLUMN IF NOT EXISTS signed_off_at TIMESTAMP;
