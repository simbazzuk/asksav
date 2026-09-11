SELECT
  i.created_at,
  i.property_id,
  i.asset,
  i.visual_change_type,
  i.defect_detected,
  i.defect_type,
  i.condition_direction,
  i.severity,
  i.consensus_status,
  i.agreement_score,
  i.confidence,

  p.surface_condition AS previous_condition,
  p.cosmetic_observation AS previous_cosmetic,
  p.cosmetic_detail AS previous_cosmetic_detail,

  c.surface_condition AS current_condition,
  c.cosmetic_observation AS current_cosmetic,
  c.cosmetic_detail AS current_cosmetic_detail,

  i.summary,
  i.recommended_action

FROM `siteface-dev.siteface.inspections` i
LEFT JOIN `siteface-dev.siteface.observations` p
  ON i.previous_observation_id = p.observation_id
LEFT JOIN `siteface-dev.siteface.observations` c
  ON i.current_observation_id = c.observation_id
ORDER BY i.created_at DESC
LIMIT 50;
