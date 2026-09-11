ALTER TABLE `siteface-dev.siteface.observations`
ADD COLUMN IF NOT EXISTS cosmetic_observation STRING;

ALTER TABLE `siteface-dev.siteface.observations`
ADD COLUMN IF NOT EXISTS cosmetic_detail STRING;
