CREATE TABLE IF NOT EXISTS `siteface-dev.siteface.properties` (
  property_id STRING NOT NULL,
  property_name STRING,
  address_line1 STRING,
  address_line2 STRING,
  city STRING,
  postcode STRING,
  property_type STRING,
  status STRING,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `siteface-dev.siteface.property_assets` (
  property_id STRING NOT NULL,
  room_id STRING NOT NULL,
  room_name STRING NOT NULL,
  asset_id STRING NOT NULL,
  asset_name STRING NOT NULL,
  display_order INT64,
  is_active BOOL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `siteface-dev.siteface.inspection_sessions` (
  session_id STRING NOT NULL,
  property_id STRING NOT NULL,
  inspection_type STRING,
  status STRING,
  total_items INT64,
  completed_items INT64,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP
);

ALTER TABLE `siteface-dev.siteface.inspections`
ADD COLUMN IF NOT EXISTS session_id STRING;

ALTER TABLE `siteface-dev.siteface.inspections`
ADD COLUMN IF NOT EXISTS room_id STRING;

ALTER TABLE `siteface-dev.siteface.inspections`
ADD COLUMN IF NOT EXISTS room_name STRING;

ALTER TABLE `siteface-dev.siteface.inspections`
ADD COLUMN IF NOT EXISTS asset_id STRING;

ALTER TABLE `siteface-dev.siteface.inspections`
ADD COLUMN IF NOT EXISTS asset_name STRING;
