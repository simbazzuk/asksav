CREATE TABLE IF NOT EXISTS `siteface-dev.siteface.session_events` (
  event_id STRING NOT NULL,
  session_id STRING NOT NULL,
  event_type STRING NOT NULL,
  status STRING NOT NULL,
  signed_off_by STRING,
  notes STRING,
  created_at TIMESTAMP NOT NULL
);

-- Backfill one CREATED event for existing sessions with no event history.
INSERT INTO `siteface-dev.siteface.session_events` (
  event_id,
  session_id,
  event_type,
  status,
  signed_off_by,
  notes,
  created_at
)
SELECT
  GENERATE_UUID(),
  s.session_id,
  CASE WHEN s.status = 'COMPLETED' THEN 'SIGNED_OFF' ELSE 'CREATED' END,
  COALESCE(s.status, 'IN_PROGRESS'),
  s.signed_off_by,
  s.sign_off_notes,
  COALESCE(s.signed_off_at, s.created_at, CURRENT_TIMESTAMP())
FROM `siteface-dev.siteface.inspection_sessions` s
WHERE NOT EXISTS (
  SELECT 1
  FROM `siteface-dev.siteface.session_events` e
  WHERE e.session_id = s.session_id
);

CREATE OR REPLACE VIEW `siteface-dev.siteface.inspection_sessions_current` AS
WITH latest_event AS (
  SELECT
    session_id,
    event_type,
    status,
    signed_off_by,
    notes,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY session_id
      ORDER BY created_at DESC, event_id DESC
    ) AS rn
  FROM `siteface-dev.siteface.session_events`
),
inspection_counts AS (
  SELECT
    session_id,
    COUNT(*) AS completed_items
  FROM `siteface-dev.siteface.inspections`
  WHERE session_id IS NOT NULL
  GROUP BY session_id
)
SELECT
  s.session_id,
  s.property_id,
  s.inspection_type,
  COALESCE(le.status, s.status, 'IN_PROGRESS') AS status,
  s.total_items,
  COALESCE(ic.completed_items, 0) AS completed_items,
  s.started_at,
  CASE
    WHEN COALESCE(le.status, s.status) = 'COMPLETED'
    THEN COALESCE(le.created_at, s.completed_at, s.signed_off_at)
    ELSE NULL
  END AS completed_at,
  s.created_at,
  COALESCE(le.signed_off_by, s.signed_off_by) AS signed_off_by,
  COALESCE(le.notes, s.sign_off_notes) AS sign_off_notes,
  CASE
    WHEN COALESCE(le.status, s.status) = 'COMPLETED'
    THEN COALESCE(le.created_at, s.signed_off_at)
    ELSE NULL
  END AS signed_off_at,
  le.event_type AS latest_event_type
FROM `siteface-dev.siteface.inspection_sessions` s
LEFT JOIN latest_event le
  ON le.session_id = s.session_id
 AND le.rn = 1
LEFT JOIN inspection_counts ic
  ON ic.session_id = s.session_id;
