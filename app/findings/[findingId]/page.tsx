import AppShell from "../../../components/AppShell";
import { getFinding } from "../../../lib/finding-data";
import EvidenceClient from "./EvidenceClient";

export const dynamic = "force-dynamic";

export default async function FindingPage({
  params,
}: {
  params: Promise<{ findingId: string }>;
}) {
  const { findingId } = await params;
  const finding = await getFinding(findingId);

  if (!finding) {
    return (
      <AppShell title="Finding">
        <div className="card empty-state">Finding not found.</div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Finding evidence">
      <EvidenceClient
  finding={JSON.parse(JSON.stringify(finding))}
/>
    </AppShell>
  );
}


