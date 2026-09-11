import AppShell from "../../../../components/AppShell";
import {
  getPropertyRecord,
  getPropertyAssets,
} from "../../../../lib/property-data";
import ConfigurePropertyClient from "./ConfigurePropertyClient";

export const dynamic = "force-dynamic";

export default async function ConfigurePropertyPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;

  const [property, assets] = await Promise.all([
    getPropertyRecord(propertyId),
    getPropertyAssets(propertyId),
  ]);

  const propertyName = property?.property_name || propertyId;
  const address = [
    property?.address_line1,
    property?.city,
    property?.postcode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <AppShell title="Configure property">
      <div className="sf1267-configure-page">
        <section className="sf1267-property-hero">
          <div className="sf1267-property-icon" aria-hidden="true">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V21h14V9.5" />
              <path d="M9 21v-6h6v6" />
            </svg>
          </div>

          <div className="sf1267-property-copy">
            <div className="sf1267-eyebrow">PROPERTY SETUP</div>
            <h1>{propertyName}</h1>
            <p>{address || "Property address not available"}</p>
          </div>

          <div className="sf1267-setup-status">
            <span className="sf1267-status-dot" />
            Setup in progress
          </div>
        </section>

        <div className="sf1267-progress-strip">
          <div className="sf1267-progress-step done">
            <div className="sf1267-step-number">1</div>
            <div>
              <strong>Property details</strong>
              <span>Complete</span>
            </div>
          </div>

          <div className="sf1267-progress-line done" />

          <div className="sf1267-progress-step active">
            <div className="sf1267-step-number">2</div>
            <div>
              <strong>Inspection areas</strong>
              <span>Configure checklist</span>
            </div>
          </div>

          <div className="sf1267-progress-line" />

          <div className="sf1267-progress-step">
            <div className="sf1267-step-number">3</div>
            <div>
              <strong>First inspection</strong>
              <span>Capture baseline</span>
            </div>
          </div>
        </div>

        <ConfigurePropertyClient
          propertyId={propertyId}
          initialAssets={assets as any[]}
        />
      </div>
    </AppShell>
  );
}
