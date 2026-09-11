import Link from "next/link";
import AppShell from "../../components/AppShell";
import { listProperties } from "../../lib/property-data";
import { dateText } from "../../lib/ui";

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  const properties = await listProperties();

  return (
    <AppShell title="Properties">
      <div className="page-head">
        <div>
          <h1>Properties</h1>
          <p>Manage property records, inspection structure and history.</p>
        </div>

        <div className="actions">
          <Link href="/properties/new" className="btn">
            + Add property
          </Link>
        </div>
      </div>

      <div className="card table-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Address</th>
                <th>Type</th>
                <th>Configured assets</th>
                <th>Last inspected</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {(properties as any[]).map((p) => (
                <tr key={p.property_id}>
                  <td>
                    <strong>{p.property_name || p.property_id}</strong>
                    <div className="muted small-copy">{p.property_id}</div>
                  </td>

                  <td>
                    {p.address_line1}
                    <div className="muted small-copy">
                      {[p.city, p.postcode].filter(Boolean).join(", ")}
                    </div>
                  </td>

                  <td>{p.property_type || "—"}</td>
                  <td>{String(p.configured_assets || 0)}</td>
                  <td>{dateText(p.last_inspection)}</td>

                  <td>
                    <div className="table-actions">
                      <Link
                        className="btn secondary"
                        href={`/properties/${encodeURIComponent(p.property_id)}/configure`}
                      >
                        Configure
                      </Link>

                      <Link
                        className="btn"
                        href={`/inspection-session?property=${encodeURIComponent(p.property_id)}`}
                      >
                        Inspect
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(properties as any[]).length === 0 && (
          <div className="empty-state">
            No properties yet. Add your first property to begin.
          </div>
        )}
      </div>
    </AppShell>
  );
}
