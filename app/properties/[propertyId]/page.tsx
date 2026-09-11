import Link from "next/link";
import AppShell from "../../../components/AppShell";
import { getProperty } from "../../../lib/data";
import { conditionClass, dateText, pretty } from "../../../lib/ui";

export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const rows = await getProperty(propertyId);

  const assets = rows as any[];
  const poor = assets.filter((x) => x.current_condition === "POOR").length;
  const attention = assets.filter((x) => x.current_condition === "ATTENTION").length;
  const good = assets.filter((x) => x.current_condition === "GOOD").length;

  const overall = poor > 0 ? "POOR" : attention > 0 ? "ATTENTION" : "GOOD";

  return (
    <AppShell title="Property">
      <section className="card card-pad">
        <div className="property-hero">
          <div>
            <div className="property-title">
              <h1>{propertyId}</h1>
              <span className={`status-chip ${conditionClass(overall)}`}>
                {pretty(overall)}
              </span>
            </div>
            <p className="muted" style={{ marginBottom: 0 }}>
              {assets.length} monitored assets
            </p>
          </div>

          <Link
            className="btn"
            href={`/inspection-session?property=${encodeURIComponent(propertyId)}`}
          >
            Start inspection
          </Link>
        </div>

        <div className="tabs">
          <span className="tab active">Overview</span>
          <span className="tab">Rooms</span>
          <span className="tab">Findings</span>
          <span className="tab">Inspections</span>
          <span className="tab">Photos</span>
        </div>
      </section>

      <section className="metrics" style={{ marginTop: 16 }}>
        <div className="card metric">
          <div className="metric-label">Good assets</div>
          <div className="metric-value">{good}</div>
        </div>
        <div className="card metric">
          <div className="metric-label">Attention</div>
          <div className="metric-value">{attention}</div>
        </div>
        <div className="card metric">
          <div className="metric-label">Poor</div>
          <div className="metric-value">{poor}</div>
        </div>
        <div className="card metric">
          <div className="metric-label">Active findings</div>
          <div className="metric-value">
            {assets.filter((x) => x.defect_detected).length}
          </div>
        </div>
      </section>

      <div className="section-title">
        <h2>Latest asset condition</h2>
      </div>

      <div className="card table-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Condition</th>
                <th>Finding</th>
                <th>Severity</th>
                <th>Last inspected</th>
              </tr>
            </thead>

            <tbody>
              {assets.map((a) => (
                <tr key={a.asset}>
                  <td><strong>{pretty(a.asset)}</strong></td>
                  <td>
                    <span className={`status-chip ${conditionClass(a.current_condition)}`}>
                      {pretty(a.current_condition)}
                    </span>
                  </td>
                  <td>{a.defect_detected ? pretty(a.defect_type) : "None"}</td>
                  <td>{pretty(a.severity)}</td>
                  <td>{dateText(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
