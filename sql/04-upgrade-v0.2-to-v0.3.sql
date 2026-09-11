CREATE TABLE IF NOT EXISTS `siteface-dev.siteface.observations` (
  observation_id STRING NOT NULL,
  inspection_id STRING NOT NULL,
  property_id STRING NOT NULL,
  asset STRING NOT NULL,
  image_role STRING NOT NULL,
  image_uri STRING NOT NULL,
  objects_summary STRING,
  surface_condition STRING,
  defect_detected BOOL,
  defect_type STRING,
  severity STRING,
  confidence FLOAT64,
  summary STRING,
  created_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(created_at)
CLUSTER BY property_id, asset, image_role;

ALTER TABLE `siteface-dev.siteface.inspections`
ADD COLUMN IF NOT EXISTS previous_observation_id STRING;

ALTER TABLE `siteface-dev.siteface.inspections`
ADD COLUMN IF NOT EXISTS current_observation_id STRING;

ALTER TABLE `siteface-dev.siteface.inspections`
ADD COLUMN IF NOT EXISTS agreement_score FLOAT64;

ALTER TABLE `siteface-dev.siteface.inspections`
ADD COLUMN IF NOT EXISTS consensus_status STRING;

ALTER TABLE `siteface-dev.siteface.inspections`
ADD COLUMN IF NOT EXISTS consensus_reason STRING;

ALTER TABLE `siteface-dev.siteface.inspections`
ADD COLUMN IF NOT EXISTS direct_confidence FLOAT64;
