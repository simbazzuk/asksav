import Link from "next/link";

export default function AskSAVPurpose() {
  return (
    <section className="sf103-home">
      <div className="sf103-hero">
        <div className="sf103-hero-copy">
          <div className="sf103-eyebrow">PROPERTY CONDITION INTELLIGENCE</div>

          <h2>
            See what changed.
            <br />
            Spot what needs attention.
          </h2>

          <p className="sf103-hero-lead">
            AskSAV compares property inspection photos over time, helping you
            identify meaningful changes and build an evidence-backed history of
            property condition.
          </p>

          <div className="sf103-actions">
          <a
            className="btn sf1265-register-property"
            href="/properties/new"
          >
            Register property
          </a>
            <Link className="btn" href="/inspection-session">
              Start inspection
            </Link>

            <Link className="btn secondary" href="/properties">
              View properties
            </Link>
          </div>
        <div className="sf1265-new-user-help">
          New property? Register it first, then configure what you want AskSAV to inspect.
        </div>

          <div className="sf103-trust">
            <span>AI-assisted</span>
            <i></i>
            <span>Evidence-led</span>
            <i></i>
            <span>Human-reviewed</span>
          </div>
        </div>

        <div className="sf103-comparison" aria-label="Example AskSAV comparison">
          <div className="sf103-comparison-top">
            <span>Example comparison</span>
            <span className="sf103-status-pill">AI assessed</span>
          </div>

          <div className="sf103-images">
            <div className="sf103-image-card">
              <div className="sf103-image-label">BEFORE</div>
              <div className="sf103-wall">
                <div className="sf103-window"></div>
                <div className="sf103-floor"></div>
              </div>
              <small>Kitchen wall</small>
            </div>

            <div className="sf103-compare-arrow">→</div>

            <div className="sf103-image-card">
              <div className="sf103-image-label current">CURRENT</div>
              <div className="sf103-wall">
                <div className="sf103-window"></div>
                <div className="sf103-mark"></div>
                <div className="sf103-floor"></div>
              </div>
              <small>Kitchen wall</small>
            </div>
          </div>

          <div className="sf103-result">
            <div className="sf103-result-icon">!</div>
            <div>
              <strong>Change detected</strong>
              <p>Potential surface staining identified for review.</p>
            </div>
            <div className="sf103-confidence">
              <strong>91%</strong>
              <span>confidence</span>
            </div>
          </div>

          <Link className="sf103-review-link" href="/findings">
            Review evidence →
          </Link>
        </div>
      </div>

      <div className="sf103-explainer">
        <strong>How AskSAV works</strong>
        <span>
          Capture evidence → compare over time → review findings → keep the
          history.
        </span>
        <Link href="/how-it-works">Learn more →</Link>
      </div>
    </section>
  );
}
