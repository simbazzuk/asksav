ALTER TABLE `siteface-dev.siteface.inspections`
ADD COLUMN IF NOT EXISTS visual_change_type STRING;

ALTER TABLE `siteface-dev.siteface.inspections`
ADD COLUMN IF NOT EXISTS change_description STRING;

ALTER TABLE `siteface-dev.siteface.inspections`
ADD COLUMN IF NOT EXISTS defect_detected BOOL;

ALTER TABLE `siteface-dev.siteface.inspections`
ADD COLUMN IF NOT EXISTS defect_type STRING;

ALTER TABLE `siteface-dev.siteface.inspections`
ADD COLUMN IF NOT EXISTS condition_changed BOOL;

ALTER TABLE `siteface-dev.siteface.inspections`
ADD COLUMN IF NOT EXISTS condition_direction STRING;

ALTER TABLE `siteface-dev.siteface.inspections`
ADD COLUMN IF NOT EXISTS previous_condition STRING;

ALTER TABLE `siteface-dev.siteface.inspections`
ADD COLUMN IF NOT EXISTS current_condition STRING;

ALTER TABLE `siteface-dev.siteface.inspections`
ADD COLUMN IF NOT EXISTS severity STRING;

ALTER TABLE `siteface-dev.siteface.inspections`
ADD COLUMN IF NOT EXISTS comparison_quality STRING;
