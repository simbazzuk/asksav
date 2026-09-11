import { bigquery, location } from "./google";
import { toPlainRow } from "./bigquery-plain";

function nice(value?: string | null) {
  return String(value ?? "-")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildDetailedComparison(item: any) {
  const baseline = String(item.consensus_status ?? "").toUpperCase() === "BASELINE";

  const previous = {
    condition: item.previous_observation_condition ?? item.previous_condition ?? "UNKNOWN",
    summary: item.previous_observation_summary ?? "",
    defectDetected:
      item.previous_observation_defect_detected ?? item.defect_detected ?? false,
    defectType: item.previous_observation_defect_type ?? "NONE",
    severity: item.previous_observation_severity ?? item.previous_severity ?? "NONE",
    cosmetic: item.previous_cosmetic_observation ?? "NONE",
    cosmeticDetail: item.previous_cosmetic_detail ?? "",
  };

  const current = {
    condition: item.current_observation_condition ?? item.current_condition ?? "UNKNOWN",
    summary: item.current_observation_summary ?? item.summary ?? "",
    defectDetected:
      item.current_observation_defect_detected ?? item.defect_detected ?? false,
    defectType: item.current_observation_defect_type ?? item.defect_type ?? "NONE",
    severity: item.current_observation_severity ?? item.severity ?? "NONE",
    cosmetic: item.current_cosmetic_observation ?? "NONE",
    cosmeticDetail: item.current_cosmetic_detail ?? "",
  };

  let whatChanged = String(item.change_description || "").trim();

  if (baseline) {
    whatChanged =
      "This is the baseline inspection for this item. No earlier SiteFace image is available for comparison.";
  } else if (!whatChanged) {
    whatChanged = item.changed
      ? "A visual difference was detected between the previous and current inspection."
      : "No material visual change was detected between the previous and current inspection.";
  }

  let whatStayedSame = "";

  if (baseline) {
    whatStayedSame =
      "Future inspections will compare against this evidence to identify change over time.";
  } else {
    const sameCondition =
      String(previous.condition).toUpperCase() === String(current.condition).toUpperCase();
    const sameDefect =
      Boolean(previous.defectDetected) === Boolean(current.defectDetected);

    if (sameCondition && sameDefect) {
      whatStayedSame =
        `Overall condition remained ${nice(current.condition)} and the defect assessment did not materially change.`;
    } else if (sameCondition) {
      whatStayedSame =
        `Overall condition remained ${nice(current.condition)}, although the defect assessment changed.`;
    } else if (sameDefect) {
      whatStayedSame =
        "The defect assessment remained consistent, although the overall condition classification changed.";
    } else {
      whatStayedSame =
        "The comparison indicates both condition and defect-assessment differences between inspections.";
    }
  }

  let conditionAssessment = baseline
    ? `Baseline condition recorded as ${nice(current.condition)} with severity ${nice(current.severity)}.`
    : `Condition moved from ${nice(previous.condition)} to ${nice(current.condition)}.`;

  if (!baseline) {
    const direction = String(item.condition_direction || "NONE").toUpperCase();
    if (direction !== "NONE") {
      conditionAssessment += ` Direction: ${nice(direction)}.`;
    }

    if (item.defect_detected) {
      conditionAssessment += ` Potential defect: ${nice(item.defect_type)} at ${nice(item.severity)} severity.`;
    } else {
      conditionAssessment += " No property-condition defect was supported by the final assessment.";
    }
  }

  const confidence =
    item.confidence == null ? null : Math.round(Number(item.confidence) * 100);

  const quality = String(item.comparison_quality || "").trim();
  const evidenceQuality = baseline
    ? "Baseline evidence captured."
    : `${quality ? `${nice(quality)} comparison quality. ` : ""}${
        confidence == null ? "" : `${confidence}% assessment confidence.`
      }`.trim();

  const comparisonNarrative = baseline
    ? `${whatChanged} ${conditionAssessment}`
    : `${whatChanged} ${whatStayedSame} ${conditionAssessment}`;

  return {
    baseline,
    previous,
    current,
    whatChanged,
    whatStayedSame,
    conditionAssessment,
    evidenceQuality,
    comparisonNarrative,
    recommendedAction:
      item.recommended_action || "No action recorded.",
  };
}

export async function getSessionReportData(sessionId: string) {
  const [sessionRows] = await bigquery.query({
    query: `
      SELECT
        s.*,
        p.property_name,
        p.address_line1,
        p.address_line2,
        p.city,
        p.postcode,
        p.property_type
      FROM \`siteface-dev.siteface.inspection_sessions_current\` s
      LEFT JOIN \`siteface-dev.siteface.properties\` p
        ON p.property_id = s.property_id
      WHERE s.session_id = @sessionId
      LIMIT 1
    `,
    params: { sessionId },
    location,
  });

  if (!sessionRows.length) return null;

  const [inspectionRows] = await bigquery.query({
    query: `
      SELECT
        i.inspection_id,
        i.property_id,
        i.session_id,
        i.room_id,
        i.room_name,
        i.asset_id,
        i.asset_name,
        i.asset,
        i.before_uri,
        i.after_uri,
        i.changed,
        i.change_type,
        i.visual_change_type,
        i.change_description,
        i.defect_detected,
        i.defect_type,
        i.condition_changed,
        i.condition_direction,
        i.previous_condition,
        i.current_condition,
        i.previous_severity,
        i.current_severity,
        i.severity,
        i.confidence,
        i.comparison_quality,
        i.consensus_status,
        i.consensus_reason,
        i.agreement_score,
        i.direct_confidence,
        i.summary,
        i.recommended_action,
        i.previous_observation_id,
        i.current_observation_id,
        i.created_at,

        po.surface_condition AS previous_observation_condition,
        po.defect_detected AS previous_observation_defect_detected,
        po.defect_type AS previous_observation_defect_type,
        po.severity AS previous_observation_severity,
        po.summary AS previous_observation_summary,
        po.cosmetic_observation AS previous_cosmetic_observation,
        po.cosmetic_detail AS previous_cosmetic_detail,

        co.surface_condition AS current_observation_condition,
        co.defect_detected AS current_observation_defect_detected,
        co.defect_type AS current_observation_defect_type,
        co.severity AS current_observation_severity,
        co.summary AS current_observation_summary,
        co.cosmetic_observation AS current_cosmetic_observation,
        co.cosmetic_detail AS current_cosmetic_detail

      FROM \`siteface-dev.siteface.inspections\` i
      LEFT JOIN \`siteface-dev.siteface.observations\` po
        ON po.observation_id = i.previous_observation_id
      LEFT JOIN \`siteface-dev.siteface.observations\` co
        ON co.observation_id = i.current_observation_id
      WHERE i.session_id = @sessionId
      ORDER BY i.created_at, i.room_name, i.asset_name
    `,
    params: { sessionId },
    location,
  });

  const [findingRows] = await bigquery.query({
    query: `
      SELECT f.*
      FROM \`siteface-dev.siteface.findings_current\` f
      WHERE f.session_id = @sessionId
         OR f.inspection_id IN (
           SELECT inspection_id
           FROM \`siteface-dev.siteface.inspections\`
           WHERE session_id = @sessionId
         )
      ORDER BY COALESCE(f.latest_event_at, f.created_at)
    `,
    params: { sessionId },
    location,
  });

  const session = toPlainRow(sessionRows[0]);
  const inspections = inspectionRows.map((r: any) => {
    const row = toPlainRow(r);
    return {
      ...row,
      comparison_detail: buildDetailedComparison(row),
    };
  });
  const findings = findingRows.map((r: any) => toPlainRow(r));

  const highPriority = findings.filter((f: any) =>
    ["HIGH", "CRITICAL"].includes(String(f.severity ?? "").toUpperCase())
  ).length;

  return {
    session,
    inspections,
    findings,
    summary: {
      itemsInspected: inspections.length,
      conditionFindings: findings.length,
      highPriority,
    },
  };
}
