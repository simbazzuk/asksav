import { bigquery, dataset, location, projectId, storage } from "./google";

import { createSign } from "node:crypto";
type AnyObject = Record<string, any>;

type UsageSource = "AI_GENERATE_TEXT" | "ML_FALLBACK_ESTIMATE";

type UsageCall = {
  stage: string;
  source: UsageSource;
  input_tokens: number;
  output_tokens: number;
  thinking_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  estimated_cost_gbp: number;
};

type UsageCollector = {
  calls: UsageCall[];
};

const MODEL_INPUT_USD_PER_MILLION = Number(
  process.env.SITEFACE_MODEL_INPUT_USD_PER_MILLION || "1.50"
);
const MODEL_OUTPUT_USD_PER_MILLION = Number(
  process.env.SITEFACE_MODEL_OUTPUT_USD_PER_MILLION || "9.00"
);
const USD_TO_GBP = Number(process.env.SITEFACE_USD_TO_GBP || "0.77");
const FALLBACK_IMAGE_INPUT_TOKENS = Number(
  process.env.SITEFACE_IMAGE_INPUT_TOKENS_ESTIMATE || "1000"
);

function safeUsageNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function normaliseStatistics(value: unknown): AnyObject {
  if (!value) return {};
  if (typeof value === "object") return value as AnyObject;

  const text = String(value).trim();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function findTokenValue(value: unknown, patterns: RegExp[]): number {
  const root = normaliseStatistics(value);
  let found = 0;

  function visit(node: unknown) {
    if (!node || typeof node !== "object") return;

    for (const [key, child] of Object.entries(node as AnyObject)) {
      const keyText = key.toLowerCase().replace(/[_\-\s]/g, "");

      if (
        patterns.some((pattern) => pattern.test(keyText)) &&
        (typeof child === "number" || typeof child === "string")
      ) {
        found = Math.max(found, safeUsageNumber(child));
      }

      if (child && typeof child === "object") visit(child);
    }
  }

  visit(root);
  return found;
}

function tokenUsageFromStatistics(statistics: unknown) {
  const input = findTokenValue(statistics, [
    /prompt.*token/,
    /input.*token/,
  ]);
  const output = findTokenValue(statistics, [
    /candidate.*token/,
    /output.*token/,
    /response.*token/,
  ]);
  const thinking = findTokenValue(statistics, [
    /thought.*token/,
    /thinking.*token/,
    /reasoning.*token/,
  ]);
  const reportedTotal = findTokenValue(statistics, [/total.*token/]);

  return {
    input_tokens: Math.round(input),
    output_tokens: Math.round(output),
    thinking_tokens: Math.round(thinking),
    total_tokens: Math.round(
      reportedTotal || input + output + thinking
    ),
  };
}

function estimatedTokenUsage(
  prompt: string,
  response: string,
  hasImage: boolean
) {
  // Fallback only. AI.GENERATE_TEXT statistics are preferred when available.
  const textInputTokens = Math.ceil(prompt.length / 4);
  const imageTokens = hasImage ? FALLBACK_IMAGE_INPUT_TOKENS : 0;
  const outputTokens = Math.ceil(response.length / 4);

  return {
    input_tokens: textInputTokens + imageTokens,
    output_tokens: outputTokens,
    thinking_tokens: 0,
    total_tokens: textInputTokens + imageTokens + outputTokens,
  };
}

function usageCost(tokens: {
  input_tokens: number;
  output_tokens: number;
  thinking_tokens: number;
}) {
  const inputUsd =
    (tokens.input_tokens / 1_000_000) * MODEL_INPUT_USD_PER_MILLION;
  const outputUsd =
    ((tokens.output_tokens + tokens.thinking_tokens) / 1_000_000) *
    MODEL_OUTPUT_USD_PER_MILLION;
  const usd = inputUsd + outputUsd;

  return {
    estimated_cost_usd: Number(usd.toFixed(8)),
    estimated_cost_gbp: Number((usd * USD_TO_GBP).toFixed(8)),
  };
}

function recordUsage(
  collector: UsageCollector,
  stage: string,
  source: UsageSource,
  tokens: {
    input_tokens: number;
    output_tokens: number;
    thinking_tokens: number;
    total_tokens: number;
  }
) {
  const cost = usageCost(tokens);

  collector.calls.push({
    stage,
    source,
    ...tokens,
    ...cost,
  });
}

function summariseUsage(collector: UsageCollector) {
  const totals = collector.calls.reduce(
    (acc, call) => {
      acc.input_tokens += call.input_tokens;
      acc.output_tokens += call.output_tokens;
      acc.thinking_tokens += call.thinking_tokens;
      acc.total_tokens += call.total_tokens;
      acc.estimated_cost_usd += call.estimated_cost_usd;
      acc.estimated_cost_gbp += call.estimated_cost_gbp;
      return acc;
    },
    {
      input_tokens: 0,
      output_tokens: 0,
      thinking_tokens: 0,
      total_tokens: 0,
      estimated_cost_usd: 0,
      estimated_cost_gbp: 0,
    }
  );

  const gbp = Number(totals.estimated_cost_gbp.toFixed(6));
  const usd = Number(totals.estimated_cost_usd.toFixed(6));

  return {
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
    calls: collector.calls,
    call_count: collector.calls.length,
    input_tokens: totals.input_tokens,
    output_tokens: totals.output_tokens,
    thinking_tokens: totals.thinking_tokens,
    total_tokens: totals.total_tokens,
    estimated_cost_usd: usd,
    estimated_cost_gbp: gbp,
    estimated_cost_pence: Number((gbp * 100).toFixed(4)),
    pricing_assumptions: {
      input_usd_per_million: MODEL_INPUT_USD_PER_MILLION,
      output_and_reasoning_usd_per_million: MODEL_OUTPUT_USD_PER_MILLION,
      usd_to_gbp: USD_TO_GBP,
      fallback_image_input_tokens: FALLBACK_IMAGE_INPUT_TOKENS,
    },
    note:
      "Cost telemetry uses BigQuery AI.GENERATE_TEXT token statistics when available. " +
      "If BigQuery falls back to ML.GENERATE_TEXT, prompt/image/output tokens are estimated. " +
      "BigQuery compute, storage and network charges are not included.",
  };
}


function cleanString(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function cleanNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function cleanList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(cleanString).filter(Boolean).slice(0, 10);
}

function clampConfidence(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function stripFence(value: string) {
  return value
    .replace(/^\s*```(?:json|javascript|js)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

function findBalancedJsonObject(value: string) {
  const start = value.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < value.length; i++) {
    const ch = value[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      if (inString) escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return value.slice(start, i + 1);
    }
  }

  return null;
}

function parseGeneratedJson(value: unknown, label: string): AnyObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as AnyObject;
  }

  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} returned no generated text.`);

  console.log(`[SiteFace] ${label} raw response:`, text.slice(0, 6000));

  const candidates: string[] = [];
  const add = (candidate: string | null | undefined) => {
    const next = candidate?.trim();
    if (next && !candidates.includes(next)) candidates.push(next);
  };

  add(text);
  add(stripFence(text));

  const fenced = text.match(/```(?:json|javascript|js)?\s*([\s\S]*?)```/i);
  add(fenced?.[1]);

  try {
    const outer = JSON.parse(text);
    if (outer && typeof outer === "object" && !Array.isArray(outer)) {
      return outer as AnyObject;
    }
    if (typeof outer === "string") {
      add(outer);
      add(stripFence(outer));
    }
  } catch {
    // Continue through fallback candidates.
  }

  for (const candidate of [...candidates]) {
    add(findBalancedJsonObject(candidate));
  }

  let lastError = "";

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as AnyObject;
      }

      if (typeof parsed === "string") {
        const parsedAgain = JSON.parse(stripFence(parsed));
        if (parsedAgain && typeof parsedAgain === "object" && !Array.isArray(parsedAgain)) {
          return parsedAgain as AnyObject;
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  console.error(`[SiteFace] ${label} JSON parse failed. Raw response:`, text);

  throw new Error(
    `${label} returned an unexpected response format.` +
      (lastError ? ` Parser detail: ${lastError}` : "")
  );
}

type VisualJsonOptions = {
  retryPrompt?: string;
  maxOutputTokens?: number;
  retryMaxOutputTokens?: number;
};

async function executeVisualJson(
  uri: string,
  prompt: string,
  label: string,
  maxOutputTokens = 2048,
  usage?: UsageCollector
) {
  const safeMaxOutputTokens = Math.max(
    256,
    Math.min(4096, Math.round(maxOutputTokens))
  );

  const aiQuery = `
    SELECT
      result AS response,
      status,
      statistics
    FROM AI.GENERATE_TEXT(
      MODEL \`${projectId}.${dataset}.gemini_model\`,
      (
        SELECT
          STRUCT(
            @prompt AS instruction,
            OBJ.MAKE_REF(@uri) AS image
          ) AS prompt
      ),
      STRUCT(
        0.0 AS temperature,
        ${safeMaxOutputTokens} AS max_output_tokens
      )
    )
  `;

  try {
    const [rows] = await bigquery.query({
      query: aiQuery,
      location,
      params: { prompt, uri },
    });

    const row = (rows[0] || {}) as AnyObject;
    const status = String(row.status || "").trim();
    const responseText = String(row.response ?? "");
    const tokens = tokenUsageFromStatistics(row.statistics);

    console.log(
      `[SiteFace] ${label} AI.GENERATE_TEXT metadata:`,
      JSON.stringify({
        status: status || null,
        response_length: responseText.length,
        max_output_tokens: safeMaxOutputTokens,
        token_usage: tokens,
      })
    );

    if (status) {
      throw new Error(`${label} returned status: ${status}`);
    }

    if (usage) {
      const usableTokens =
        tokens.total_tokens > 0
          ? tokens
          : estimatedTokenUsage(prompt, responseText, true);

      recordUsage(
        usage,
        label,
        tokens.total_tokens > 0 ? "AI_GENERATE_TEXT" : "ML_FALLBACK_ESTIMATE",
        usableTokens
      );
    }

    return parseGeneratedJson(row.response, label);
  } catch (aiError) {
    console.warn(
      `[SiteFace] ${label} AI.GENERATE_TEXT unavailable; falling back to ML.GENERATE_TEXT:`,
      aiError
    );
  }

  const mlQuery = `
    SELECT
      ml_generate_text_llm_result AS response,
      ml_generate_text_status AS status
    FROM ML.GENERATE_TEXT(
      MODEL \`${projectId}.${dataset}.gemini_model\`,
      (
        SELECT
          STRUCT(
            @prompt AS instruction,
            OBJ.MAKE_REF(@uri) AS image
          ) AS prompt
      ),
      STRUCT(
        0.0 AS temperature,
        ${safeMaxOutputTokens} AS max_output_tokens,
        TRUE AS flatten_json_output
      )
    )
  `;

  const [rows] = await bigquery.query({
    query: mlQuery,
    location,
    params: { prompt, uri },
  });

  const row = (rows[0] || {}) as AnyObject;
  const status = String(row.status || "").trim();
  const responseText = String(row.response ?? "");

  console.log(
    `[SiteFace] ${label} ML.GENERATE_TEXT fallback metadata:`,
    JSON.stringify({
      status: status || null,
      response_length: responseText.length,
      max_output_tokens: safeMaxOutputTokens,
    })
  );

  if (status) {
    throw new Error(`${label} returned status: ${status}`);
  }

  if (usage) {
    recordUsage(
      usage,
      label,
      "ML_FALLBACK_ESTIMATE",
      estimatedTokenUsage(prompt, responseText, true)
    );
  }

  return parseGeneratedJson(row.response, label);
}

async function runVisualJson(
  uri: string,
  prompt: string,
  label: string,
  options: VisualJsonOptions = {},
  usage?: UsageCollector
) {
  const firstMax = options.maxOutputTokens ?? 2048;

  try {
    return await executeVisualJson(uri, prompt, label, firstMax, usage);
  } catch (error) {
    if (!options.retryPrompt) throw error;

    const firstError = error instanceof Error ? error.message : String(error);
    console.warn(
      `[SiteFace] ${label} first attempt failed; retrying with compact output contract:`,
      firstError
    );

    const retryMax = options.retryMaxOutputTokens ?? 1024;

    try {
      return await executeVisualJson(
        uri,
        options.retryPrompt,
        `${label} retry`,
        retryMax,
        usage
      );
    } catch (retryError) {
      const retryMessage =
        retryError instanceof Error ? retryError.message : String(retryError);

      console.error(
        `[SiteFace] ${label} retry failed:`,
        retryMessage
      );

      throw new Error(
        `${label} failed after retry. First attempt: ${firstError}. Retry: ${retryMessage}`
      );
    }
  }
}

async function classifyObject(uri: string, hint: string, usage: UsageCollector) {
  const prompt = `
You are pass 1 of SiteFace visual grounding.

Look only at the supplied photograph and determine the BROAD PHYSICAL OBJECT TYPE.

Examples:
- computer keyboard
- laptop computer
- office chair
- bicycle
- camera lens
- mobile phone
- television
- wristwatch

Do not identify a brand or model in this pass.
Do not describe condition.
Do not guess a different object because of a weak visual resemblance.
Base the answer on the dominant object actually visible in the photograph.

The user may have supplied this hint:
${hint ? JSON.stringify(hint) : "No hint supplied"}

The hint is supporting evidence only. If the hint clearly conflicts with the image,
state that conflict. Never change the visual object class merely to satisfy the hint.

Return exactly one JSON object:
{
  "object_class": "string",
  "confidence": 0.0,
  "visible_evidence": ["string"],
  "hint_consistency": "CONSISTENT | CONFLICTING | NOT_PROVIDED",
  "hint_note": "string or null"
}

CONTEXTUAL OBJECT RULES:
- Analyse the primary consumer item in the image even when it is being worn, held, carried, installed, attached, or surrounded by other objects.
- Examples include rings or watches on a hand, jewellery on a person, shoes being worn, a handbag being carried, clothing being worn, furniture in a room, or electronics installed in a home.
- Do not identify or describe the person. Focus only on the item relevant to the requested visual-intelligence task.
- If several candidate items are visible, choose the most visually prominent analysable consumer item unless the user hint clearly names another item.
- For jewellery, watches, precious metals, gemstones and luxury goods, distinguish visible appearance from verified authenticity. Never claim precious-metal purity, gemstone identity, carat weight, authenticity, brand provenance or certification unless visible evidence supports it.
- If the item can be identified but important verification evidence is missing, still return the best item identification and lower the verification confidence. Recommend a closer image, hallmark, label, serial number or alternate angle where appropriate.
- Do not fail merely because the target item is shown on a person or in a real-world setting.`.trim();

  const parsed = await runVisualJson(uri, prompt, "Broad classification", {}, usage);

  return {
    object_class: cleanString(parsed?.object_class) || "unknown object",
    confidence: clampConfidence(parsed?.confidence),
    visible_evidence: cleanList(parsed?.visible_evidence),
    hint_consistency:
      cleanString(parsed?.hint_consistency) || (hint ? "UNKNOWN" : "NOT_PROVIDED"),
    hint_note: cleanString(parsed?.hint_note),
  };
}

async function identifyObject(uri: string, hint: string, broad: AnyObject, usage: UsageCollector) {
  const prompt = `
You are pass 2 of SiteFace visual grounding.

The broad classifier independently concluded:
Object class: ${broad.object_class}
Confidence: ${broad.confidence}
Visible evidence: ${JSON.stringify(broad.visible_evidence)}

Now identify the SAME photographed item as specifically as the visible evidence supports.

Rules:
- Your detailed identification MUST remain compatible with the broad object class unless
  the image itself provides overwhelming evidence that the broad classification was wrong.
- Never identify an object from a completely different class.
- Never invent a brand, model, variant or specification.
- A brand/model may only be supplied when text, logo, shape, controls, labels or other
  visible features materially support it.
- If only the generic object is supported, use null for brand/model/variant.
- Confidence in an exact model must be lower than confidence in the broad object type
  unless a readable model marking is visible.
- 0.95 or higher should be reserved for unusually strong visual evidence.
- Keep identifying_features concise: maximum 4 entries, maximum 10 words each.
- Keep visible_text concise: maximum 4 entries, maximum 8 words each.
${hint ? `User hint: ${JSON.stringify(hint)}. Treat it as supporting evidence, not proof.` : ""}

OUTPUT CONTRACT:
Return exactly one valid JSON object.
Do not use markdown fences.
Do not add commentary.
Use null for unknown brand/model/variant.
Keep every string short.

Return exactly this shape:
{
  "category": "string",
  "item_name": "string",
  "brand": null,
  "model": null,
  "variant": null,
  "confidence": 0.0,
  "identifying_features": ["short string"],
  "visible_text": ["short string"]
}
`.trim();

  const retryPrompt = `
Inspect the SAME image again.

Broad object class: ${broad.object_class}
Broad confidence: ${broad.confidence}
${hint ? `Optional user hint: ${JSON.stringify(hint)}` : ""}

Return a VERY SMALL JSON object only.

Rules:
- Stay within the broad object class.
- Do not invent brand/model/variant.
- Maximum 3 identifying_features.
- Maximum 2 visible_text entries.
- Each array entry must be under 8 words.
- No markdown.
- No prose before or after JSON.

{
  "category": "string",
  "item_name": "string",
  "brand": null,
  "model": null,
  "variant": null,
  "confidence": 0.0,
  "identifying_features": ["short string"],
  "visible_text": ["short string"]
}
`.trim();

  try {
    const parsed = await runVisualJson(
      uri,
      prompt,
      "Detailed identification",
      {
        retryPrompt,
        maxOutputTokens: 1536,
        retryMaxOutputTokens: 768,
      },
      usage
    );

    return {
      category: cleanString(parsed?.category) || broad.object_class || "Item",
      item_name: cleanString(parsed?.item_name) || broad.object_class || "Unidentified item",
      brand: cleanString(parsed?.brand),
      model: cleanString(parsed?.model),
      variant: cleanString(parsed?.variant),
      confidence: clampConfidence(parsed?.confidence),
      identifying_features: cleanList(parsed?.identifying_features).slice(0, 4),
      visible_text: cleanList(parsed?.visible_text).slice(0, 4),
      fallback_used: false,
    };
  } catch (error) {
    console.warn(
      "[SiteFace] Detailed identification unavailable after retry; using broad classification fallback:",
      error
    );

    const fallbackName =
      cleanString(broad?.object_class) ||
      "Unidentified item";

    return {
      category: fallbackName,
      item_name: fallbackName,
      brand: null,
      model: null,
      variant: null,
      confidence: Math.min(clampConfidence(broad?.confidence), 0.75),
      identifying_features: cleanList(broad?.visible_evidence).slice(0, 3),
      visible_text: [],
      fallback_used: true,
    };
  }
}

async function verifyIdentification(
  uri: string,
  hint: string,
  broad: AnyObject,
  identification: AnyObject,
  usage: UsageCollector
) {
  const prompt = `
You are pass 3, the SiteFace anti-hallucination verifier.

Inspect the photograph again independently.

Broad classification:
${JSON.stringify(broad)}

Detailed identification:
${JSON.stringify(identification)}

User hint:
${hint ? JSON.stringify(hint) : "No hint supplied"}

Decide whether the detailed identification is genuinely supported by the image.

Verification rules:
- Reject if broad class and detailed item are from different object families.
- Reject if claimed brand/model features are not actually visible or plausible.
- Reject impossible observations, such as describing lens glass when the image shows a keyboard.
- A generic identity can be VERIFIED even when brand/model are unknown.
- The user hint can support a result only when it is visually compatible.
- Do not allow confidence inflation.
- If brand/model are uncertain but object class is clear, keep the generic object and mark
  the exact identity as only partially supported.
- verification_confidence means confidence that the accepted identity is visually grounded.

Return exactly one JSON object:
{
  "verified": true,
  "verification_confidence": 0.0,
  "status": "VERIFIED | GENERIC_ONLY | REJECTED",
  "reason": "string",
  "accepted_item_name": "string",
  "accepted_brand": "string or null",
  "accepted_model": "string or null",
  "accepted_variant": "string or null"
}
`.trim();

  const parsed = await runVisualJson(uri, prompt, "Identity verification", {}, usage);

  return {
    verified: Boolean(parsed?.verified),
    verification_confidence: clampConfidence(parsed?.verification_confidence),
    status: cleanString(parsed?.status) || "REJECTED",
    reason: cleanString(parsed?.reason) || "Identity could not be independently verified.",
    accepted_item_name:
      cleanString(parsed?.accepted_item_name) || broad.object_class || "Unidentified item",
    accepted_brand: cleanString(parsed?.accepted_brand),
    accepted_model: cleanString(parsed?.accepted_model),
    accepted_variant: cleanString(parsed?.accepted_variant),
  };
}

async function assessCondition(uri: string, acceptedIdentity: AnyObject, usage: UsageCollector) {
  const prompt = `
You are pass 4 of SiteFace visual intelligence.

The item's VERIFIED identity is:
${JSON.stringify(acceptedIdentity)}

Assess only the VISIBLE CONDITION of that item in the photograph.

Rules:
- Do not change the identity.
- Never invent parts that do not belong to this object.
- Do not infer hidden/internal or functional condition.
- Cosmetic wear is different from structural or functional damage.
- Mention framing, blur, lighting or obscured areas as limitations.
- Condition grade must be one of EXCELLENT, GOOD, FAIR, POOR, UNKNOWN.

Return exactly one JSON object:
{
  "grade": "GOOD",
  "confidence": 0.0,
  "summary": "string",
  "visible_wear": ["string"],
  "visible_damage": ["string"],
  "limitations": ["string"]
}
`.trim();

  const parsed = await runVisualJson(uri, prompt, "Condition assessment", {}, usage);

  return {
    grade: cleanString(parsed?.grade) || "UNKNOWN",
    confidence: clampConfidence(parsed?.confidence),
    summary: cleanString(parsed?.summary) || "No condition summary returned.",
    visible_wear: cleanList(parsed?.visible_wear),
    visible_damage: cleanList(parsed?.visible_damage),
    limitations: cleanList(parsed?.limitations),
  };
}

function buildIdentityText(result: AnyObject) {
  return [
    cleanString(result?.brand),
    cleanString(result?.item_name),
    cleanString(result?.model),
    cleanString(result?.variant),
  ]
    .filter(Boolean)
    .join(" ");
}

async function generateMarketIntelligence(
  identification: AnyObject,
  condition: AnyObject,
  verification: AnyObject,
  usage: UsageCollector
) {
  const identity = buildIdentityText(identification);
  const searchQuery = identity || identification.item_name || "used item";

  if (!verification.verified || verification.verification_confidence < 0.6) {
    return {
      available: false,
      reason: "The item identity must be visually verified before SiteFace can value it.",
      currency: "GBP",
      low: null,
      high: null,
      suggested: null,
      quick_sale: null,
      confidence: 0,
      evidence_summary: null,
      search_query: searchQuery,
    };
  }

  const prompt = `
You are the market intelligence layer for SiteFace.

Research the CURRENT UK second-hand market for:
Identity: ${identity}
Visible condition grade: ${condition.grade}
Comparable search phrase: ${searchQuery}

Use Google Search grounding.

Estimate a responsible USED asking-price range in GBP.
Use currently advertised comparable items when possible.
Do not describe asking prices as completed sale prices unless evidence explicitly proves that.
Do not invent model details or specifications.
If the identity is too generic or evidence is weak, set available to false.

Return exactly one JSON object:
{
  "available": true,
  "reason": null,
  "currency": "GBP",
  "low": 0,
  "high": 0,
  "suggested": 0,
  "quick_sale": 0,
  "confidence": 0.0,
  "evidence_summary": "brief explanation",
  "search_query": "concise marketplace search query"
}
`.trim();

  try {
    let row: AnyObject;
    let usageSource: UsageSource = "AI_GENERATE_TEXT";

    try {
      const query = `
        SELECT
          result AS response,
          status,
          statistics
        FROM AI.GENERATE_TEXT(
          MODEL \`${projectId}.${dataset}.gemini_model\`,
          (SELECT @prompt AS prompt),
          STRUCT(
            0.0 AS temperature,
            2048 AS max_output_tokens,
            TRUE AS ground_with_google_search
          )
        )
      `;

      const [rows] = await bigquery.query({
        query,
        location,
        params: { prompt },
      });

      row = (rows[0] || {}) as AnyObject;
      const status = String(row.status || "").trim();
      if (status) throw new Error(status);

      const responseText = String(row.response ?? "");
      const tokens = tokenUsageFromStatistics(row.statistics);
      const usableTokens =
        tokens.total_tokens > 0
          ? tokens
          : estimatedTokenUsage(prompt, responseText, false);

      if (usage) {
        recordUsage(
          usage,
          "Market intelligence",
          tokens.total_tokens > 0 ? "AI_GENERATE_TEXT" : "ML_FALLBACK_ESTIMATE",
          usableTokens
        );
      }
    } catch (aiError) {
      console.warn(
        "[SiteFace] Market AI.GENERATE_TEXT unavailable; falling back to ML.GENERATE_TEXT:",
        aiError
      );

      usageSource = "ML_FALLBACK_ESTIMATE";

      const query = `
        SELECT
          ml_generate_text_llm_result AS response,
          ml_generate_text_status AS status
        FROM ML.GENERATE_TEXT(
          MODEL \`${projectId}.${dataset}.gemini_model\`,
          (SELECT @prompt AS prompt),
          STRUCT(
            0.0 AS temperature,
            2048 AS max_output_tokens,
            TRUE AS flatten_json_output,
            TRUE AS ground_with_google_search
          )
        )
      `;

      const [rows] = await bigquery.query({
        query,
        location,
        params: { prompt },
      });

      row = (rows[0] || {}) as AnyObject;
      const status = String(row.status || "").trim();
      if (status) throw new Error(status);

      if (usage) {
        recordUsage(
          usage,
          "Market intelligence",
          usageSource,
          estimatedTokenUsage(prompt, String(row.response ?? ""), false)
        );
      }
    }

    const parsed = parseGeneratedJson(row.response, "Market intelligence");

    return {
      available: Boolean(parsed?.available),
      reason: cleanString(parsed?.reason),
      currency: cleanString(parsed?.currency) || "GBP",
      low: cleanNumber(parsed?.low),
      high: cleanNumber(parsed?.high),
      suggested: cleanNumber(parsed?.suggested),
      quick_sale: cleanNumber(parsed?.quick_sale),
      confidence: clampConfidence(parsed?.confidence),
      evidence_summary: cleanString(parsed?.evidence_summary),
      search_query: cleanString(parsed?.search_query) || searchQuery,
    };
  } catch (error) {
    console.warn("[SiteFace] market intelligence unavailable:", error);
    return {
      available: false,
      reason:
        "Live market pricing could not be retrieved for this item. You can still use the comparable marketplace links below.",
      currency: "GBP",
      low: null,
      high: null,
      suggested: null,
      quick_sale: null,
      confidence: 0,
      evidence_summary: null,
      search_query: searchQuery,
    };
  }
}

function base64UrlJson(value: unknown) {
  return Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getGoogleStorageAccessToken() {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64?.trim();

  let clientEmail: string | undefined;
  let privateKey: string | undefined;

  if (encoded) {
    try {
      const decoded = Buffer.from(encoded, "base64").toString("utf8");
      const parsed = JSON.parse(decoded) as {
        client_email?: string;
        private_key?: string;
      };

      clientEmail = parsed.client_email;
      privateKey = parsed.private_key;

      if (!clientEmail || !privateKey) {
        throw new Error(
          "Decoded service account JSON is missing client_email or private_key."
        );
      }

      console.log("[AskSAV] Google credentials source", {
        source: "GOOGLE_SERVICE_ACCOUNT_JSON_B64",
        clientEmailPresent: true,
        privateKeyPresent: true,
      });
    } catch (error) {
      throw new Error(
        `Invalid GOOGLE_SERVICE_ACCOUNT_JSON_B64: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  } else {
    clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    console.log("[AskSAV] Google credentials source", {
      source: "GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY fallback",
      clientEmailPresent: Boolean(clientEmail),
      privateKeyPresent: Boolean(privateKey),
    });
  }

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Missing Google service account credentials. Set GOOGLE_SERVICE_ACCOUNT_JSON_B64 or the legacy GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY variables."
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({ alg: "RS256", typ: "JWT" });
  const payload = base64UrlJson({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/devstorage.read_write",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });

  const unsignedToken = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();

  const signature = signer
    .sign(privateKey, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const assertion = `${unsignedToken}.${signature}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const tokenBody = (await tokenResponse.json()) as {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!tokenResponse.ok || !tokenBody.access_token) {
    throw new Error(
      `Google OAuth token request failed (${tokenResponse.status}): ${
        tokenBody.error_description || tokenBody.error || "Unknown OAuth error"
      }`
    );
  }

  return tokenBody.access_token;
}
async function uploadItemImageViaGcsRest(args: {
  bucketName: string;
  objectName: string;
  bytes: Buffer;
  contentType: string;
}) {
  const accessToken = await getGoogleStorageAccessToken();

  const uploadUrl =
    `https://storage.googleapis.com/upload/storage/v1/b/` +
    `${encodeURIComponent(args.bucketName)}/o` +
    `?uploadType=media&name=${encodeURIComponent(args.objectName)}`;

  console.log("[AskSAV] GCS REST upload start", {
    bucketName: args.bucketName,
    objectName: args.objectName,
    contentType: args.contentType || "application/octet-stream",
    bufferSize: args.bytes.length,
  });

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": args.contentType || "application/octet-stream",
      "Cache-Control": "private, max-age=0",
    },
    body: new Uint8Array(args.bytes),
  });

  if (!response.ok) {
    const responseText = await response.text();

    console.error("[AskSAV] GCS REST upload failed", {
      bucketName: args.bucketName,
      objectName: args.objectName,
      status: response.status,
      statusText: response.statusText,
      responseBody: responseText.slice(0, 2000),
    });

    throw new Error(
      `GCS REST upload failed (${response.status} ${response.statusText})`
    );
  }

  console.log("[AskSAV] GCS REST upload success", {
    bucketName: args.bucketName,
    objectName: args.objectName,
    bufferSize: args.bytes.length,
  });
}
let askSavVisionCallSequence = 0;

async function askSavVisionCall<T>(
  label: string,
  work: () => Promise<T>,
): Promise<T> {
  const callNumber = ++askSavVisionCallSequence;
  const started = Date.now();

  console.info(
    `[AskSAV vision-call] #${callNumber} ${label} started`,
  );

  try {
    const result = await work();

    console.info(
      `[AskSAV vision-call] #${callNumber} ${label} completed in ${Date.now() - started}ms`,
    );

    return result;
  } catch (error) {
    console.error(
      `[AskSAV vision-call] #${callNumber} ${label} failed after ${Date.now() - started}ms`,
      error,
    );
    throw error;
  }
}
export async function analyseItemPhoto(image: File, hint = "") {
  const usage: UsageCollector = { calls: [] };
  const bytes = Buffer.from(await image.arrayBuffer());

  const bucketName = process.env.SITEFACE_BUCKET || "siteface-images-dev";
  const objectName = `item-analysis/${crypto.randomUUID()}/${image.name || "item.jpg"}`;

  await uploadItemImageViaGcsRest({
    bucketName,
    objectName,
    bytes,
    contentType: image.type,
  });

  const uri = `gs://${bucketName}/${objectName}`;

  const broad = await askSavVisionCall("classifyObject", async () => classifyObject(uri, hint, usage));
  const candidate = await askSavVisionCall("identifyObject", async () => identifyObject(uri, hint, broad, usage));
  const verification = await askSavVisionCall("verifyIdentification", async () => verifyIdentification(uri, hint, broad, candidate, usage));

  const identification = {
    category: candidate.category,
    item_name: verification.accepted_item_name || broad.object_class,
    brand: verification.accepted_brand,
    model: verification.accepted_model,
    variant: verification.accepted_variant,
    confidence: Math.min(
      candidate.confidence,
      broad.confidence || 1,
      verification.verification_confidence || 1
    ),
    identifying_features: candidate.identifying_features,
    visible_text: candidate.visible_text,
  };

  const condition = verification.verified
    ? await askSavVisionCall("assessCondition", async () => assessCondition(uri, identification, usage))
    : {
        grade: "UNKNOWN",
        confidence: 0,
        summary: "Condition analysis was withheld because the item identity was not verified.",
        visible_wear: [],
        visible_damage: [],
        limitations: ["Resolve the item identity before assessing condition."],
      };

  const valuation_context = {
    search_query: buildIdentityText(identification) || identification.item_name || "used item",
    attributes_to_confirm: [
      ...(identification.brand ? [] : ["brand"]),
      ...(identification.model ? [] : ["exact model"]),
    ],
  };

  const market = await askSavVisionCall("generateMarketIntelligence", async () => generateMarketIntelligence(identification, condition, verification, usage));

  const cost_telemetry = summariseUsage(usage);

  const result = {
    classification: broad,
    identification,
    verification,
    condition,
    valuation_context,
    market,
    cost_telemetry,
    evidence_uri: uri,
  };

  console.log(
    "[SiteFace] analysis cost telemetry:",
    JSON.stringify(cost_telemetry, null, 2)
  );
  console.log("[SiteFace] v0.17.13 grounded result:", JSON.stringify(result, null, 2));

  return result;
}
