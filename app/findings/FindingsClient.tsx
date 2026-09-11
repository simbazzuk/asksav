"use client";

import Link from "next/link";
import { useState } from "react";

function pretty(v?: string) {
  if (!v) return "â€”";
  return v.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, m => m.toUpperCase());
}

function dateText(v: any) {
  try {
    const raw = v?.value ?? v;
    return raw ? new Date(raw).toLocaleString() : "â€”";
  } catch {
    return "â€”";
  }
}

export default function FindingsClient({
  initialFindings,
}: {
  initialFindings: any[];
}) {
  const [findings, setFindings] = useState(initialFindings);
  const [filter, setFilter] = useState("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function refresh() {
    const qs = filter === "ALL" ? "" : `?status=${filter}`;
    const response = await fetch(`/api/findings${qs}`);
    if (response.ok) setFindings(await response.json());
  }

  async function update(id: string, status: string) {
    let resolutionNotes = "";

    if (status === "RESOLVED") {
      resolutionNotes =
        window.prompt("Resolution notes (optional):", "") || "";
    }

    try {
      setUpdatingId(id);

      const response = await fetch(`/api/findings/${id}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, resolutionNotes }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || `Unable to update finding (${response.status})`);
      }

      await refresh();
    } catch (error) {
      console.error("[AskSAV] Finding status update failed:", error);

      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to update finding."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <>
      <div className="card findings-toolbar">
        <div className="finding-filters">
          {["ALL", "OPEN", "ACKNOWLEDGED", "RESOLVED"].map((v) => (
            <button
              key={v}
              className={`filter-pill ${filter === v ? "active" : ""}`}
              onClick={async () => {
                setFilter(v);
                const qs = v === "ALL" ? "" : `?status=${v}`;
                const response = await fetch(`/api/findings${qs}`);
                if (response.ok) setFindings(await response.json());
              }}
            >
              {pretty(v)}
            </button>
          ))}
        </div>
      </div>

      <section className="finding-list">
        {findings.map((f) => (
          <article className="card finding-workflow-card" key={f.finding_id}>
            <div className="finding-card-main">
              <div className="finding-card-head">
                <div>
                  <div className="finding-property">
                    {f.property_name || f.property_id}
                  </div>
                  <h2>{f.title}</h2>
                  <div className="finding-meta">
                    {f.address_line1} Â· {dateText(f.created_at)}
                  </div>
                </div>

                <div className="finding-badges">
                  <span className={`severity severity-${String(f.severity || "NONE").toLowerCase()}`}>
                    {pretty(f.severity)}
                  </span>
                  <span className="finding-status">{pretty(f.status)}</span>
                </div>
              </div>

              <p>{f.description}</p>

              <div className="recommendation-box">
                <strong>Recommended action</strong>
                <span>{f.recommended_action || "Review finding."}</span>
              </div>

              <div className="actions">
                <Link
                  className="btn secondary"
                  href={`/findings/${encodeURIComponent(f.finding_id)}`}
                >
                  View evidence
                </Link>

                {f.status === "OPEN" && (
                  <button
                    className="btn secondary"
                    disabled={updatingId === f.finding_id}
                    onClick={() => update(f.finding_id, "ACKNOWLEDGED")}
                  >
                    {updatingId === f.finding_id ? "Updating..." : "Acknowledge"}
                  </button>
                )}

                {f.status !== "RESOLVED" && (
                  <button
                    className="btn"
                    disabled={updatingId === f.finding_id}
                    onClick={() => update(f.finding_id, "RESOLVED")}
                  >
                    {updatingId === f.finding_id ? "Updating..." : "Mark resolved"}
                  </button>
                )}

                {f.status === "RESOLVED" && (
                  <button
                    className="btn secondary"
                    disabled={updatingId === f.finding_id}
                    onClick={() => update(f.finding_id, "OPEN")}
                  >
                    {updatingId === f.finding_id ? "Updating..." : "Reopen"}
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}

        {findings.length === 0 && (
          <div className="card empty-state">
            <h3>No findings yet</h3>
            <p>AskSAV creates a finding when an inspection detects a material defect.</p>
            {process.env.NODE_ENV !== "production" && (
              <button
                className="btn"
                onClick={async () => {
                  const response = await fetch("/api/findings/demo", { method: "POST" });
                  if (response.ok) await refresh();
                  else {
                    const body = await response.json().catch(() => ({}));
                    window.alert(body.error || "Unable to create demo finding.");
                  }
                }}
              >
                Create demo finding
              </button>
            )}
          </div>
        )}
      </section>
    </>
  );
}

