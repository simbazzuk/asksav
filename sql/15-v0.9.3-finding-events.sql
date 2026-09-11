CREATE TABLE IF NOT EXISTS `siteface-dev.siteface.finding_events` (
  event_id STRING NOT NULL,
  finding_id STRING NOT NULL,
  event_type STRING NOT NULL,
  status STRING NOT NULL,
  notes STRING,
  created_at TIMESTAMP NOT NULL
);

-- Backfill an initial OPEN event for existing findings that do not yet have one.
INSERT INTO `siteface-dev.siteface.finding_events` (
  event_id,
  finding_id,
  event_type,
  status,
  notes,
  created_at
)
SELECT
  GENERATE_UUID(),
  f.finding_id,
  'CREATED',
  COALESCE(f.status, 'OPEN'),
  'Backfilled from existing findings record',
  COALESCE(f.created_at, CURRENT_TIMESTAMP())
FROM `siteface-dev.siteface.findings` f
WHERE NOT EXISTS (
  SELECT 1
  FROM `siteface-dev.siteface.finding_events` e
  WHERE e.finding_id = f.finding_id
);

CREATE OR REPLACE VIEW `siteface-dev.siteface.findings_current` AS
WITH latest_event AS (
  SELECT
    finding_id,
    status,
    event_type,
    notes,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY finding_id
      ORDER BY created_at DESC, event_id DESC
    ) AS rn
  FROM `siteface-dev.siteface.finding_events`
)
SELECT
  f.* EXCEPT(status),
  COALESCE(le.status, f.status, 'OPEN') AS status,
  le.event_type AS latest_event_type,
  le.notes AS latest_event_notes,
  le.created_at AS latest_event_at
FROM `siteface-dev.siteface.findings` f
LEFT JOIN latest_event le
  ON le.finding_id = f.finding_id
 AND le.rn = 1;

CREATE OR REPLACE VIEW `siteface-dev.siteface.open_findings` AS
SELECT *
FROM `siteface-dev.siteface.findings_current`
WHERE status IN ('OPEN', 'ACKNOWLEDGED');
