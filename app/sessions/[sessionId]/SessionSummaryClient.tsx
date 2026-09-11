"use client";

import { useState } from "react";

function label(value?: string | null) {
  return String(value ?? "-")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function confidence(value: unknown) {
  if (value == null) return "-";
  const n = Number(value);
  return Number.isFinite(n) ? `${Math.round(n * 100)}%` : "-";
}

export default function SessionSummaryClient({
  sessionId,
  initialData,
}: {
  sessionId: string;
  initialData: any;
}) {
  const [data, setData] = useState(initialData);
  const [signedOffBy, setSignedOffBy] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const session = data.session;
  const inspections = data.inspections ?? [];
  const findings = data.findings ?? [];

  const completed = Number(session.completed_items ?? inspections.length ?? 0);
  const total = Number(session.total_items ?? 0);
  const isComplete = total > 0 ? completed >= total : inspections.length > 0;
  const isSignedOff = session.status === "COMPLETED";

  async function refresh() {
    const response = await fetch(`/api/sessions/${sessionId}/report`, {
      cache: "no-store",
    });

    if (!response.ok) return;
    const refreshed = await response.json();
    if (refreshed?.data) setData(refreshed.data);
  }

  async function signOff() {
    setError("");

    if (!signedOffBy.trim()) {
      setError("Enter the inspector name before signing off.");
      return;
    }

    try {
      setBusy(true);

      const response = await fetch(`/api/sessions/${sessionId}/complete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          signedOffBy: signedOffBy.trim(),
          notes: notes.trim(),
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Unable to sign off inspection");
      }

      await refresh();
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign off inspection");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sf94-wrap sf127-wrap">
      <div className="page-head sf94-page-head">
        <div>
          <div className="sf94-kicker">{session.property_name ?? "Property"}</div>
          <h1>Inspection review</h1>
          <p>
            {session.address_line1 ?? ""}
            {session.city ? ` · ${session.city}` : ""}
            {session.postcode ? ` · ${session.postcode}` : ""}
          </p>
        </div>
        <div className={`sf94-status ${isSignedOff ? "done" : "draft"}`}>
          {isSignedOff ? "Completed" : "In progress"}
        </div>
      </div>

      <div className="sf94-stats">
        <div className="card sf94-stat">
          <span>Items inspected</span>
          <strong>{completed}</strong>
          <small>of {total || "configured items"}</small>
        </div>
        <div className="card sf94-stat">
          <span>Findings</span>
          <strong>{findings.length}</strong>
          <small>condition findings</small>
        </div>
        <div className="card sf94-stat">
          <span>Started</span>
          <strong className="sf94-date">{formatDate(session.started_at)}</strong>
        </div>
        <div className="card sf94-stat">
          <span>Status</span>
          <strong className="sf94-date">{label(session.status)}</strong>
        </div>
      </div>

      {!isComplete && (
        <div className="sf94-draft-note">
          <strong>Inspection still in progress.</strong> Complete all configured
          inspection items before final sign-off. You can preview a draft report now.
        </div>
      )}

      <div className="card card-pad sf94-section sf127-section">
        <div className="sf94-section-head">
          <div>
            <h2>Detailed comparison</h2>
            <p>
              Previous evidence, current evidence, visual change and condition
              assessment for each inspected item.
            </p>
          </div>
          <a
            className="btn secondary"
            href={`/api/sessions/${sessionId}/report?format=pdf`}
            target="_blank"
            rel="noreferrer"
          >
            {isSignedOff ? "Download detailed report" : "Preview detailed draft"}
          </a>
        </div>

        {inspections.length === 0 ? (
          <div className="sf94-empty">
            No inspection items have been completed in this session yet.
          </div>
        ) : (
          <div className="sf127-items">
            {inspections.map((item: any, index: number) => {
              const detail = item.comparison_detail ?? {};
              const previous = detail.previous ?? {};
              const current = detail.current ?? {};

              return (
                <article className="sf127-item" key={item.inspection_id}>
                  <div className="sf127-item-head">
                    <div>
                      <div className="sf127-item-kicker">
                        ITEM {index + 1} · {detail.baseline ? "BASELINE" : "COMPARISON"}
                      </div>
                      <h3>
                        {item.room_name || "Area"} ·{" "}
                        {item.asset_name || item.asset || "Asset"}
                      </h3>
                    </div>

                    <div className="sf127-pills">
                      <span>{label(item.current_condition)}</span>
                      <span>{label(item.severity)}</span>
                      <span>{confidence(item.confidence)}</span>
                    </div>
                  </div>

                  <div className="sf127-evidence-grid">
                    <div className="sf127-evidence previous">
                      <div className="sf127-evidence-label">Previous inspection</div>
                      <div className="sf127-evidence-row">
                        <span>Condition</span>
                        <strong>{label(previous.condition)}</strong>
                      </div>
                      <div className="sf127-evidence-row">
                        <span>Defect</span>
                        <strong>
                          {previous.defectDetected
                            ? label(previous.defectType)
                            : "None detected"}
                        </strong>
                      </div>
                      <div className="sf127-evidence-row">
                        <span>Severity</span>
                        <strong>{label(previous.severity)}</strong>
                      </div>
                      <p>
                        {previous.summary ||
                          (detail.baseline
                            ? "No earlier AskSAV evidence exists."
                            : "No independent previous-image summary is available.")}
                      </p>
                      {previous.cosmetic &&
                        String(previous.cosmetic).toUpperCase() !== "NONE" && (
                          <small>
                            Cosmetic: {label(previous.cosmetic)}
                            {previous.cosmeticDetail
                              ? ` — ${previous.cosmeticDetail}`
                              : ""}
                          </small>
                        )}
                    </div>

                    <div className="sf127-arrow" aria-hidden="true">→</div>

                    <div className="sf127-evidence current">
                      <div className="sf127-evidence-label">Current inspection</div>
                      <div className="sf127-evidence-row">
                        <span>Condition</span>
                        <strong>{label(current.condition)}</strong>
                      </div>
                      <div className="sf127-evidence-row">
                        <span>Defect</span>
                        <strong>
                          {current.defectDetected
                            ? label(current.defectType)
                            : "None detected"}
                        </strong>
                      </div>
                      <div className="sf127-evidence-row">
                        <span>Severity</span>
                        <strong>{label(current.severity)}</strong>
                      </div>
                      <p>{current.summary || item.summary || "Inspection completed."}</p>
                      {current.cosmetic &&
                        String(current.cosmetic).toUpperCase() !== "NONE" && (
                          <small>
                            Cosmetic: {label(current.cosmetic)}
                            {current.cosmeticDetail
                              ? ` — ${current.cosmeticDetail}`
                              : ""}
                          </small>
                        )}
                    </div>
                  </div>

                  <div className="sf127-analysis-grid">
                    <div className="sf127-analysis-block changed">
                      <span>WHAT CHANGED VISUALLY</span>
                      <p>{detail.whatChanged || item.change_description || "-"}</p>
                    </div>

                    <div className="sf127-analysis-block same">
                      <span>WHAT STAYED THE SAME</span>
                      <p>{detail.whatStayedSame || "-"}</p>
                    </div>

                    <div className="sf127-analysis-block condition">
                      <span>CONDITION ASSESSMENT</span>
                      <p>{detail.conditionAssessment || item.summary || "-"}</p>
                    </div>

                    <div className="sf127-analysis-block quality">
                      <span>EVIDENCE QUALITY</span>
                      <p>{detail.evidenceQuality || "-"}</p>
                    </div>
                  </div>

                  <div className="sf127-narrative">
                    <span>COMPARISON ASSESSMENT</span>
                    <p>{detail.comparisonNarrative || item.summary || "-"}</p>
                  </div>

                  <div className="sf127-action">
                    <span>RECOMMENDED ACTION</span>
                    <p>{detail.recommendedAction || item.recommended_action || "-"}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="card card-pad sf94-section">
        <h2>Findings raised</h2>
        {findings.length === 0 ? (
          <div className="sf94-empty">No property-condition findings raised.</div>
        ) : (
          <div className="sf94-items">
            {findings.map((finding: any) => (
              <div className="sf94-item" key={finding.finding_id}>
                <div>
                  <strong>{finding.title}</strong>
                  <p>{finding.description}</p>
                </div>
                <div className="sf94-item-meta">
                  <span>{label(finding.status)}</span>
                  <span>{label(finding.severity)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card card-pad sf94-section">
        <h2>Inspector sign-off</h2>

        {isSignedOff ? (
          <div className="sf94-signoff-complete">
            <strong>Inspection signed off</strong>
            <div>Inspector: {session.signed_off_by || "-"}</div>
            <div>Signed off: {formatDate(session.signed_off_at)}</div>
            {session.sign_off_notes && <div>Notes: {session.sign_off_notes}</div>}
          </div>
        ) : (
          <>
            <div className="sf94-form">
              <label>
                Inspector name
                <input
                  value={signedOffBy}
                  onChange={(e) => setSignedOffBy(e.target.value)}
                  placeholder="Enter inspector name"
                />
              </label>

              <label>
                Sign-off notes
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes"
                  rows={4}
                />
              </label>
            </div>

            {error && <div className="sf94-error">{error}</div>}

            <button
              className="btn"
              disabled={!isComplete || busy}
              onClick={signOff}
            >
              {busy ? "Signing off..." : "Complete & sign off"}
            </button>

            {!isComplete && (
              <p className="sf94-help">
                Sign-off becomes available after all configured items are inspected.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
