import AppShell from "../../../components/AppShell";
import { getSessionReportData } from "../../../lib/report-data";
import SessionSummaryClient from "./SessionSummaryClient";

export const dynamic = "force-dynamic";

export default async function SessionSummaryPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const data = await getSessionReportData(sessionId);

  if (!data) {
    return (
      <AppShell title="Inspection summary">
        <div className="card card-pad">
          <h1>Inspection not found</h1>
          <p>The requested inspection session could not be found.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Inspection summary">
      <SessionSummaryClient
        sessionId={sessionId}
        initialData={JSON.parse(JSON.stringify(data))}
      />
    </AppShell>
  );
}
