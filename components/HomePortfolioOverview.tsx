import Link from "next/link";

type Props = {
  propertyCount?: number;
  activeFindings?: number;
  needsReview?: number;
};

export default function HomePortfolioOverview({
  propertyCount = 0,
  activeFindings = 0,
  needsReview = 0,
}: Props) {
  return (
    <section className="sf103-dashboard-section">
      <div className="sf103-section-title">
        <div>
          <span className="sf103-eyebrow">YOUR PORTFOLIO</span>
          <h3>At a glance</h3>
        </div>

        <Link href="/properties">View all properties →</Link>
      </div>

      <div className="sf103-metrics">
        <Link className="sf103-metric properties" href="/properties">
          <div className="sf103-metric-icon">⌂</div>
          <div>
            <strong>{propertyCount}</strong>
            <span>Properties</span>
          </div>
        </Link>

        <Link className="sf103-metric findings" href="/findings">
          <div className="sf103-metric-icon">!</div>
          <div>
            <strong>{activeFindings}</strong>
            <span>Active findings</span>
          </div>
        </Link>

        <Link className="sf103-metric review" href="/findings">
          <div className="sf103-metric-icon">◉</div>
          <div>
            <strong>{needsReview}</strong>
            <span>Needs review</span>
          </div>
        </Link>
      </div>
    </section>
  );
}
