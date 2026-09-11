import AppShell from "../../components/AppShell";
import { listFindings } from "../../lib/finding-data";
import FindingsClient from "./FindingsClient";

export const dynamic = "force-dynamic";

export default async function FindingsPage() {
  const findings = JSON.parse(JSON.stringify(await listFindings()));

  return (
    <AppShell title="Findings">
      <div className="page-head">
        <div>
          <h1>Findings</h1>
          <p>Review, acknowledge and resolve property-condition findings.</p>
        </div>
      </div>

      <FindingsClient initialFindings={findings as any[]} />
    </AppShell>
  );
}

