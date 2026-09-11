import { randomUUID } from "crypto";
import {
  bigquery,
  bucketName,
  dataset,
  location,
  model,
  projectId,
  storage,
} from "./google";

type ImageObservation = {
  objects_summary: string;
  surface_condition: string;
  cosmetic_observation: string;
  cosmetic_detail: string;
  defect_detected: boolean;
  defect_type: string;
  severity: string;
  confidence: number;
  summary: string;
};

type DirectComparison = {
  changed: boolean;
  visual_change_type: string;
  change_description: string;
  defect_detected: boolean;
  defect_type: string;
  condition_changed: boolean;
  condition_direction: string;
  previous_condition: string;
  current_condition: string;
  severity: string;
  confidence: number;
  comparison_quality: string;
  summary: string;
  recommended_action: string;
};

function safePart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 80);
}

function conditionRank(value: string) {
  return ({ GOOD: 0, ATTENTION: 1, POOR: 2 } as Record<string, number>)[value] ?? 0;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

async function uploadImage(
  file: File,
  propertyId: string,
  inspectionId: string,
  role: "before" | "after"
) {
  const extension =
    file.type === "image/png" ? "png" :
    file.type === "image/webp" ? "webp" : "jpg";

  const objectName =
    `properties/${safePart(propertyId)}/${inspectionId}/${role}.${extension}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  await storage.bucket(bucketName).file(objectName).save(buffer, {
    contentType: file.type,
    resumable: false,
    metadata: {
      metadata: {
        propertyId,
        inspectionId,
        role,
      },
    },
  });

  return `gs://${bucketName}/${objectName}`;
}

async function analyseImage(args: {
  imageUri: string;
  propertyId: string;
  asset: string;
  role: "PREVIOUS" | "CURRENT";
}): Promise<ImageObservation> {
  const modelPath = `\`${projectId}.${dataset}.${model}\``;

  const query = `
    SELECT
      objects_summary,
      surface_condition,
      cosmetic_observation,
      cosmetic_detail,
      defect_detected,
      defect_type,
      severity,
      confidence,
      summary
    FROM AI.GENERATE_TABLE(
      MODEL ${modelPath},
      (
        SELECT STRUCT(
          @instruction,
          OBJ.MAKE_REF(@image_uri)
        ) AS prompt
      ),
      STRUCT(
        """
          objects_summary STRING,
          surface_condition STRING OPTIONS(description = 'GOOD, ATTENTION, POOR, UNKNOWN'),
          cosmetic_observation STRING OPTIONS(description = 'NONE, MINOR, MATERIAL'),
          cosmetic_detail STRING,
          defect_detected BOOL,
          defect_type STRING OPTIONS(description = 'NONE, CRACK, DAMP, MOULD, WATER_STAINING, SURFACE_DAMAGE, BROKEN_FIXTURE, MISSING_COMPONENT, OTHER'),
          severity STRING OPTIONS(description = 'NONE, LOW, MODERATE, HIGH, CRITICAL'),
          confidence FLOAT64,
          summary STRING
        """ AS output_schema,
        0.1 AS temperature,
        1536 AS max_output_tokens
      )
    )
  `;

  const instruction = `
You are SiteFace performing an independent property inspection of ONE image.

This is the ${args.role} image.
Property: ${args.propertyId}
Area/asset: ${args.asset}

Separate genuine PROPERTY CONDITION from COSMETIC APPEARANCE.

Property-condition issues include cracks, damp, mould, water staining, broken
fixtures, material surface damage, missing building components and obvious deterioration.

Cosmetic observations include superficial dirt, minor scuffs, smudging,
paint variation, tarnish and minor marks.

If only cosmetic issues are visible:
- surface_condition = GOOD
- defect_detected = false
- defect_type = NONE
- severity = NONE

Do not infer hidden causes or structural conclusions.
`;

  const [rows] = await bigquery.query({
    query,
    location,
    params: { instruction, image_uri: args.imageUri },
  });

  if (!rows.length) throw new Error(`No ${args.role.toLowerCase()} observation returned.`);
  return rows[0] as ImageObservation;
}

async function compareImages(args: {
  beforeUri: string;
  afterUri: string;
  propertyId: string;
  asset: string;
}): Promise<DirectComparison> {
  const modelPath = `\`${projectId}.${dataset}.${model}\``;

  const query = `
    SELECT
      changed,
      visual_change_type,
      change_description,
      defect_detected,
      defect_type,
      condition_changed,
      condition_direction,
      previous_condition,
      current_condition,
      severity,
      confidence,
      comparison_quality,
      summary,
      recommended_action
    FROM AI.GENERATE_TABLE(
      MODEL ${modelPath},
      (
        SELECT STRUCT(
          @instruction,
          OBJ.MAKE_REF(@before_uri),
          'CURRENT IMAGE:',
          OBJ.MAKE_REF(@after_uri)
        ) AS prompt
      ),
      STRUCT(
        """
          changed BOOL,
          visual_change_type STRING OPTIONS(description = 'NONE, OBJECT_ADDED, OBJECT_REMOVED, OBJECT_MOVED, SURFACE_CHANGE, CONDITION_CHANGE, OTHER'),
          change_description STRING,
          defect_detected BOOL,
          defect_type STRING OPTIONS(description = 'NONE, CRACK, DAMP, MOULD, WATER_STAINING, SURFACE_DAMAGE, BROKEN_FIXTURE, MISSING_COMPONENT, OTHER'),
          condition_changed BOOL,
          condition_direction STRING OPTIONS(description = 'NONE, DETERIORATED, IMPROVED, UNCERTAIN'),
          previous_condition STRING OPTIONS(description = 'GOOD, ATTENTION, POOR, UNKNOWN'),
          current_condition STRING OPTIONS(description = 'GOOD, ATTENTION, POOR, UNKNOWN'),
          severity STRING OPTIONS(description = 'NONE, LOW, MODERATE, HIGH, CRITICAL'),
          confidence FLOAT64,
          comparison_quality STRING OPTIONS(description = 'GOOD, FAIR, POOR'),
          summary STRING,
          recommended_action STRING
        """ AS output_schema,
        0.1 AS temperature,
        2048 AS max_output_tokens
      )
    )
  `;

  const instruction = `
You are SiteFace comparing TWO photographs of the SAME property area.

First image = PREVIOUS inspection.
Second image after CURRENT IMAGE = CURRENT inspection.

Property: ${args.propertyId}
Area/asset: ${args.asset}

A visual change is not automatically a defect.
Object addition/removal/movement is not deterioration by itself.
Minor cosmetic marks are not automatically property defects.
Only report genuine condition change where directly supported.
If framing or lighting makes comparison uncertain, lower confidence.
If no defect is supported, severity must be NONE.
`;

  const [rows] = await bigquery.query({
    query,
    location,
    params: {
      instruction,
      before_uri: args.beforeUri,
      after_uri: args.afterUri,
    },
  });

  if (!rows.length) throw new Error("No direct comparison returned.");
  return rows[0] as DirectComparison;
}

function buildConsensus(
  previous: ImageObservation,
  current: ImageObservation,
  direct: DirectComparison
) {
  let agreements = 0;
  let checks = 0;

  checks++;
  if (direct.defect_detected === current.defect_detected) agreements++;

  const previousRank = conditionRank(previous.surface_condition);
  const currentRank = conditionRank(current.surface_condition);

  let independentDirection = "NONE";
  if (currentRank > previousRank) independentDirection = "DETERIORATED";
  if (currentRank < previousRank) independentDirection = "IMPROVED";

  const directDirection =
    direct.condition_direction === "UNCERTAIN" ? "NONE" : direct.condition_direction;

  checks++;
  if (
    directDirection === independentDirection ||
    (!direct.condition_changed && independentDirection === "NONE")
  ) {
    agreements++;
  }

  checks++;
  if (
    !direct.defect_detected ||
    direct.defect_type === current.defect_type ||
    current.defect_type === "OTHER"
  ) {
    agreements++;
  }

  const agreementScore = checks ? agreements / checks : 0;

  const defectDetected =
    direct.defect_detected &&
    current.defect_detected &&
    (current.confidence ?? 0) >= 0.75;

  const conditionChanged =
    direct.condition_changed &&
    independentDirection !== "NONE" &&
    direct.condition_direction === independentDirection;

  let consensusStatus = "AGREED";
  if (agreementScore < 0.5) consensusStatus = "DISAGREEMENT";
  else if (agreementScore < 0.8) consensusStatus = "PARTIAL_AGREEMENT";

  const confidence = clamp01(
    ((direct.confidence ?? 0) * 0.5) +
    ((current.confidence ?? 0) * 0.3) +
    ((previous.confidence ?? 0) * 0.2)
  );

  const severity = defectDetected ? direct.severity : "NONE";
  const defectType = defectDetected ? direct.defect_type : "NONE";

  let recommendedAction = "No action required.";
  let consensusReason = "";

  if (consensusStatus === "DISAGREEMENT") {
    recommendedAction = "Reinspect with matched framing and review the evidence.";
    consensusReason = "The independent observations and direct comparison materially disagree.";
  } else if (consensusStatus === "PARTIAL_AGREEMENT") {
    recommendedAction =
      defectDetected || conditionChanged
        ? "Review the finding before taking action."
        : "No immediate action required; retain the evidence for review.";
    consensusReason =
      "Most signals align, but one evidence check differs.";
  } else if (defectDetected || conditionChanged) {
    recommendedAction = direct.recommended_action;
    consensusReason =
      "Independent observations and direct comparison align in supporting the condition finding.";
  } else {
    recommendedAction =
      direct.comparison_quality === "POOR"
        ? "Reinspect with matched framing."
        : "No action required for the visual change unless local context suggests otherwise.";
    consensusReason =
      "Independent observations and direct comparison do not support a property-condition defect.";
  }

  const cosmeticNote =
    previous.cosmetic_observation !== "NONE" ||
    current.cosmetic_observation !== "NONE"
      ? " Cosmetic observations are tracked separately."
      : "";

  const summary =
    defectDetected || conditionChanged
      ? direct.summary + cosmeticNote
      : direct.changed
        ? `${direct.change_description} Independent inspection does not support treating this visual change as a property defect.${cosmeticNote}`
        : `No material visual or condition change is supported.${cosmeticNote}`;

  return {
    changed: direct.changed,
    visual_change_type: direct.visual_change_type,
    change_description: direct.change_description,
    defect_detected: defectDetected,
    defect_type: defectType,
    condition_changed: conditionChanged,
    condition_direction: conditionChanged ? direct.condition_direction : "NONE",
    previous_condition: previous.surface_condition,
    current_condition: current.surface_condition,
    severity,
    confidence,
    comparison_quality: direct.comparison_quality,
    agreement_score: agreementScore,
    consensus_status: consensusStatus,
    consensus_reason: consensusReason,
    summary,
    recommended_action: recommendedAction,
  };
}

async function getPreviousImage(propertyId: string, asset: string) {
  const query = `
    SELECT after_uri
    FROM \`${projectId}.${dataset}.inspections\`
    WHERE property_id = @property_id
      AND asset = @asset
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const [rows] = await bigquery.query({
    query,
    location,
    params: {
      property_id: propertyId,
      asset,
    },
  });

  return rows.length ? String(rows[0].after_uri) : null;
}

export async function inspectCurrentPhoto(args: {
  current: File;
  propertyId: string;
  asset: string;
  sessionId?: string;
  roomId?: string;
  roomName?: string;
  assetId?: string;
  assetName?: string;
}) {
  const previousUri = await getPreviousImage(args.propertyId, args.asset);

  if (!previousUri) {
    const inspectionId = randomUUID();
    const currentUri = await uploadImage(
      args.current,
      args.propertyId,
      inspectionId,
      "after"
    );

    const currentObservation = await analyseImage({
      imageUri: currentUri,
      propertyId: args.propertyId,
      asset: args.asset,
      role: "CURRENT",
    });

    const observationId = randomUUID();
    const now = new Date().toISOString();

    await bigquery.dataset(dataset).table("observations").insert([{
      observation_id: observationId,
      inspection_id: inspectionId,
      session_id: args.sessionId || null,
      room_id: args.roomId || null,
      room_name: args.roomName || null,
      asset_id: args.assetId || args.asset,
      asset_name: args.assetName || args.asset,
      property_id: args.propertyId,
      asset: args.asset,
      image_role: "CURRENT",
      image_uri: currentUri,
      objects_summary: currentObservation.objects_summary,
      surface_condition: currentObservation.surface_condition,
      cosmetic_observation: currentObservation.cosmetic_observation,
      cosmetic_detail: currentObservation.cosmetic_detail,
      defect_detected: currentObservation.defect_detected,
      defect_type: currentObservation.defect_type,
      severity: currentObservation.severity,
      confidence: currentObservation.confidence,
      summary: currentObservation.summary,
      created_at: now,
    }]);

    await bigquery.dataset(dataset).table("inspections").insert([{
      inspection_id: inspectionId,
      session_id: args.sessionId || null,
      room_id: args.roomId || null,
      room_name: args.roomName || null,
      asset_id: args.assetId || args.asset,
      asset_name: args.assetName || args.asset,
      property_id: args.propertyId,
      asset: args.asset,
      before_uri: currentUri,
      after_uri: currentUri,
      changed: false,
      change_type: "BASELINE",
      finding: currentObservation.defect_type,
      previous_severity: "NONE",
      current_severity: currentObservation.severity,
      confidence: currentObservation.confidence,
      summary: "Baseline inspection captured. Future inspections will compare against this image.",
      recommended_action: currentObservation.defect_detected
        ? "Review the baseline condition finding."
        : "No action required.",
      visual_change_type: "BASELINE",
      change_description: "Initial baseline image captured.",
      defect_detected: currentObservation.defect_detected,
      defect_type: currentObservation.defect_type,
      condition_changed: false,
      condition_direction: "NONE",
      previous_condition: currentObservation.surface_condition,
      current_condition: currentObservation.surface_condition,
      severity: currentObservation.severity,
      comparison_quality: "BASELINE",
      previous_observation_id: observationId,
      current_observation_id: observationId,
      agreement_score: 1,
      consensus_status: "BASELINE",
      consensus_reason: "No previous image exists for this property and asset.",
      direct_confidence: currentObservation.confidence,
      created_at: now,
    }]);

    return {
      mode: "BASELINE",
      inspection_id: inspectionId,
      session_id: args.sessionId || null,
      room_id: args.roomId || null,
      room_name: args.roomName || null,
      asset_id: args.assetId || args.asset,
      asset_name: args.assetName || args.asset,
      changed: false,
      visual_change_type: "BASELINE",
      current_condition: currentObservation.surface_condition,
      defect_detected: currentObservation.defect_detected,
      defect_type: currentObservation.defect_type,
      severity: currentObservation.severity,
      confidence: currentObservation.confidence,
      consensus_status: "BASELINE",
      agreement_score: 1,
      summary: "Baseline inspection captured. The next photo for this asset will be compared automatically.",
      recommended_action: currentObservation.defect_detected
        ? "Review the baseline condition finding."
        : "No action required.",
      current_observation: {
        observation_id: observationId,
        role: "CURRENT",
        ...currentObservation,
      },
    };
  }

  const inspectionId = randomUUID();
  const currentUri = await uploadImage(
    args.current,
    args.propertyId,
    inspectionId,
    "after"
  );

  const [previousObservation, currentObservation, direct] = await Promise.all([
    analyseImage({
      imageUri: previousUri,
      propertyId: args.propertyId,
      asset: args.asset,
      role: "PREVIOUS",
    }),
    analyseImage({
      imageUri: currentUri,
      propertyId: args.propertyId,
      asset: args.asset,
      role: "CURRENT",
    }),
    compareImages({
      beforeUri: previousUri,
      afterUri: currentUri,
      propertyId: args.propertyId,
      asset: args.asset,
    }),
  ]);

  const previousObservationId = randomUUID();
  const currentObservationId = randomUUID();
  const now = new Date().toISOString();

  await bigquery.dataset(dataset).table("observations").insert([
    {
      observation_id: previousObservationId,
      inspection_id: inspectionId,
      session_id: args.sessionId || null,
      room_id: args.roomId || null,
      room_name: args.roomName || null,
      asset_id: args.assetId || args.asset,
      asset_name: args.assetName || args.asset,
      property_id: args.propertyId,
      asset: args.asset,
      image_role: "PREVIOUS",
      image_uri: previousUri,
      objects_summary: previousObservation.objects_summary,
      surface_condition: previousObservation.surface_condition,
      cosmetic_observation: previousObservation.cosmetic_observation,
      cosmetic_detail: previousObservation.cosmetic_detail,
      defect_detected: previousObservation.defect_detected,
      defect_type: previousObservation.defect_type,
      severity: previousObservation.severity,
      confidence: previousObservation.confidence,
      summary: previousObservation.summary,
      created_at: now,
    },
    {
      observation_id: currentObservationId,
      inspection_id: inspectionId,
      session_id: args.sessionId || null,
      room_id: args.roomId || null,
      room_name: args.roomName || null,
      asset_id: args.assetId || args.asset,
      asset_name: args.assetName || args.asset,
      property_id: args.propertyId,
      asset: args.asset,
      image_role: "CURRENT",
      image_uri: currentUri,
      objects_summary: currentObservation.objects_summary,
      surface_condition: currentObservation.surface_condition,
      cosmetic_observation: currentObservation.cosmetic_observation,
      cosmetic_detail: currentObservation.cosmetic_detail,
      defect_detected: currentObservation.defect_detected,
      defect_type: currentObservation.defect_type,
      severity: currentObservation.severity,
      confidence: currentObservation.confidence,
      summary: currentObservation.summary,
      created_at: now,
    },
  ]);

  const consensus = buildConsensus(previousObservation, currentObservation, direct);

  await bigquery.dataset(dataset).table("inspections").insert([{
    inspection_id: inspectionId,
      session_id: args.sessionId || null,
      room_id: args.roomId || null,
      room_name: args.roomName || null,
      asset_id: args.assetId || args.asset,
      asset_name: args.assetName || args.asset,
    property_id: args.propertyId,
    asset: args.asset,
    before_uri: previousUri,
    after_uri: currentUri,
    changed: consensus.changed,
    change_type: consensus.visual_change_type,
    finding: consensus.defect_type,
    previous_severity: previousObservation.severity,
    current_severity: consensus.severity,
    confidence: consensus.confidence,
    summary: consensus.summary,
    recommended_action: consensus.recommended_action,
    visual_change_type: consensus.visual_change_type,
    change_description: consensus.change_description,
    defect_detected: consensus.defect_detected,
    defect_type: consensus.defect_type,
    condition_changed: consensus.condition_changed,
    condition_direction: consensus.condition_direction,
    previous_condition: consensus.previous_condition,
    current_condition: consensus.current_condition,
    severity: consensus.severity,
    comparison_quality: consensus.comparison_quality,
    previous_observation_id: previousObservationId,
    current_observation_id: currentObservationId,
    agreement_score: consensus.agreement_score,
    consensus_status: consensus.consensus_status,
    consensus_reason: consensus.consensus_reason,
    direct_confidence: direct.confidence,
    created_at: now,
  }]);

  return {
    mode: "COMPARISON",
    inspection_id: inspectionId,
      session_id: args.sessionId || null,
      room_id: args.roomId || null,
      room_name: args.roomName || null,
      asset_id: args.assetId || args.asset,
      asset_name: args.assetName || args.asset,
    ...consensus,
    previous_observation: {
      observation_id: previousObservationId,
      role: "PREVIOUS",
      ...previousObservation,
    },
    current_observation: {
      observation_id: currentObservationId,
      role: "CURRENT",
      ...currentObservation,
    },
    direct_comparison: direct,
  };
}

