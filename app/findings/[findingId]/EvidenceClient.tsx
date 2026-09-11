"use client";

import { useEffect, useState } from "react";

function pretty(v?: string) {
  if (!v) return "—";
  return v.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, m => m.toUpperCase());
}

export default function EvidenceClient({ finding }: { finding: any }) {
  const [evidence, setEvidence] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/findings/${finding.finding_id}/evidence`)
      .then(r => r.json())
      .then(setEvidence)
      .catch(() => {});
  }, [finding.finding_id]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{finding.title}</h1>
          <p>
            {finding.property_name || finding.property_id} · {finding.address_line1}
          </p>
        </div>

        <div className="finding-badges">
          <span className={`severity severity-${String(finding.severity || "NONE").toLowerCase()}`}>
            {pretty(finding.severity)}
          </span>
          <span className="finding-status">{pretty(finding.status)}</span>
        </div>
      </div>

      <section className="evidence-grid">
        <div className="card evidence-photo-card">
          <h3>Previous inspection</h3>
          <div className="evidence-photo">
            {evidence?.beforeUrl ? (
              <img src={evidence.beforeUrl} alt="Previous inspection evidence" />
            ) : (
              <span>Loading image...</span>
            )}
          </div>
        </div>

        <div className="card evidence-photo-card">
          <h3>Current inspection</h3>
          <div className="evidence-photo">
            {evidence?.afterUrl ? (
              <img src={evidence.afterUrl} alt="Current inspection evidence" />
            ) : (
              <span>Loading image...</span>
            )}
          </div>
        </div>
      </section>

      <section className="card card-pad evidence-assessment">
        <h2>AskSAV assessment</h2>

        <div className="evidence-stats">
          <div><small>Condition</small><strong>{pretty(finding.current_condition)}</strong></div>
          <div><small>Defect</small><strong>{pretty(finding.defect_type)}</strong></div>
          <div><small>Severity</small><strong>{pretty(finding.severity)}</strong></div>
          <div><small>Confidence</small><strong>{Math.round(Number(finding.confidence || 0) * 100)}%</strong></div>
        </div>

        <h3>What changed</h3>
        <p>{finding.change_description || "No comparison description available."}</p>

        <h3>Assessment</h3>
        <p>{finding.description}</p>

        <div className="recommendation-box">
          <strong>Recommended action</strong>
          <span>{finding.recommended_action}</span>
        </div>

        <details className="developer">
          <summary>Technical evidence</summary>
          <pre>{JSON.stringify({
            visual_change_type: finding.visual_change_type,
            comparison_quality: finding.comparison_quality,
            consensus_status: finding.consensus_status,
            agreement_score: finding.agreement_score,
            inspection_id: finding.inspection_id,
          }, null, 2)}</pre>
        </details>
      </section>
    </>
  );
}
