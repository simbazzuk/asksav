import AppShell from "../components/AppShell";
import VisualIntelligenceHome from "../components/VisualIntelligenceHome";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <AppShell title="Visual Intelligence">
      <VisualIntelligenceHome />
    </AppShell>
  );
}
