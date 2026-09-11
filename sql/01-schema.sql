-- Replace siteface-dev if your project ID differs.
CREATE SCHEMA IF NOT EXISTS `siteface-dev.siteface`
OPTIONS(location = 'europe-west2');

CREATE TABLE IF NOT EXISTS `siteface-dev.siteface.inspections` (
  inspection_id STRING NOT NULL,
  property_id STRING NOT NULL,
  asset STRING NOT NULL,
  before_uri STRING NOT NULL,
  after_uri STRING NOT NULL,
  changed BOOL,
  change_type STRING,
  finding STRING,
  previous_severity STRING,
  current_severity STRING,
  confidence FLOAT64,
  summary STRING,
  recommended_action STRING,
  created_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(created_at)
CLUSTER BY property_id, asset;
