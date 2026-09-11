import { Suspense } from "react";
import AppShell from "../../components/AppShell";
import InspectionSessionClient from "./InspectionSessionClient";

export const dynamic = "force-dynamic";

export default function InspectionSessionPage() {
  return (
    <AppShell title="Inspection">
      <Suspense
        fallback={
          <div className="card card-pad">
            Loading inspection session...
          </div>
        }
      >
        <InspectionSessionClient />
      </Suspense>
    </AppShell>
  );
}
