import Link from "next/link";
import AppShell from "../../components/AppShell";

const workflow = [
  {
    number: "01",
    title: "Set up the property",
    text: "Create the property record and capture the basic information that anchors future inspections and evidence.",
  },
  {
    number: "02",
    title: "Configure rooms and assets",
    text: "Define what should be inspected: rooms, walls, ceilings, windows, radiators, switches, fixtures and other relevant assets.",
  },
  {
    number: "03",
    title: "Start a guided inspection",
    text: "AskSAV creates an inspection session and guides the inspector through the configured inspection points.",
  },
  {
    number: "04",
    title: "Capture visual evidence",
    text: "Take or upload the current image. Where previous evidence exists, AskSAV can compare the same area over time.",
  },
  {
    number: "05",
    title: "AI-assisted assessment",
    text: "AskSAV separates ordinary visual change from potential property-condition issues and records confidence, context and recommended next action.",
  },
  {
    number: "06",
    title: "Review and manage findings",
    text: "Potential issues are presented with supporting evidence. Teams can acknowledge, resolve or reopen findings while retaining an audit trail.",
  },
  {
    number: "07",
    title: "Sign off and report",
    text: "When the inspection is complete, review the session, sign it off and generate a property inspection report containing the supporting evidence.",
  },
];

export default function HowItWorksPage() {
  return (
    <AppShell title="How AskSAV works">
      <div className="sf10-learn">
        <section className="sf10-learn-hero">
          <div className="sf10-eyebrow">ASKSAV</div>
          <h1>Turn property photos into inspection intelligence</h1>
          <p>
            AskSAV is designed to make property inspections more consistent,
            evidence-led and useful over time. Instead of filing away a set of
            disconnected photographs, each inspection contributes to a growing
            visual history of the property.
          </p>

          <div className="sf10-learn-actions">
            <Link className="btn" href="/properties">
              Add or select a property
            </Link>
            <Link className="btn secondary" href="/inspection-session">
              Start an inspection
            </Link>
          </div>
        </section>

        <section className="sf10-principle">
          <div>
            <div className="sf10-eyebrow">CORE PRINCIPLE</div>
            <h2>AI-assisted. Human-reviewed.</h2>
          </div>
          <p>
            AskSAV analyses visual evidence and highlights meaningful change
            or potential condition issues. It does not replace professional
            judgement. Findings are presented with evidence, confidence and
            recommended next action so a person can review the context before
            deciding what happens next.
          </p>
        </section>

        <section className="sf10-learn-section">
          <div className="sf10-section-heading">
            <div>
              <div className="sf10-eyebrow">THE FLOW</div>
              <h2>How to use AskSAV</h2>
            </div>
          </div>

          <div className="sf10-timeline">
            {workflow.map((step) => (
              <div className="sf10-timeline-step" key={step.number}>
                <div className="sf10-timeline-number">{step.number}</div>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="sf10-intelligence">
          <div className="sf10-eyebrow">WHY THE HISTORY MATTERS</div>
          <h2>Every inspection makes the property record more useful</h2>

          <div className="sf10-intelligence-flow">
            <div className="sf10-intelligence-box">
              <strong>Inspection 1</strong>
              <span>Establish baseline</span>
            </div>
            <div className="sf10-intelligence-arrow">→</div>
            <div className="sf10-intelligence-box">
              <strong>Inspection 2+</strong>
              <span>Compare over time</span>
            </div>
            <div className="sf10-intelligence-arrow">→</div>
            <div className="sf10-intelligence-box emphasized">
              <strong>Property intelligence</strong>
              <span>Changes · condition · findings · evidence</span>
            </div>
            <div className="sf10-intelligence-arrow">→</div>
            <div className="sf10-intelligence-box">
              <strong>Action & report</strong>
              <span>Review, resolve, sign off</span>
            </div>
          </div>
        </section>

        <section className="sf10-good-to-know">
          <h2>Good to know</h2>
          <div className="sf10-good-grid">
            <div className="card">
              <strong>Matched framing improves comparison</strong>
              <p>
                Similar camera position and framing make it easier to distinguish
                genuine change from a different view of the same area.
              </p>
            </div>
            <div className="card">
              <strong>Visual change is not automatically damage</strong>
              <p>
                Objects can be added, removed or moved without creating a property
                defect. AskSAV keeps those concepts separate.
              </p>
            </div>
            <div className="card">
              <strong>The first inspection is still valuable</strong>
              <p>
                Even without a previous image, it establishes the visual baseline
                that makes later inspections more informative.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
