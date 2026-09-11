export default function InspectionGuidanceCards() {
  return (
    <div className="sf1032-guidance">
      <div className="sf1032-guide blue">
        <div className="sf1032-guide-icon">⌂</div>
        <div>
          <strong>Add rooms & assets</strong>
          <p>Define the rooms, fixtures and areas you want to inspect.</p>
        </div>
      </div>

      <div className="sf1032-guide purple">
        <div className="sf1032-guide-icon">◉</div>
        <div>
          <strong>Follow the checklist</strong>
          <p>Capture photos and notes for each item in a guided flow.</p>
        </div>
      </div>

      <div className="sf1032-guide green">
        <div className="sf1032-guide-icon">▥</div>
        <div>
          <strong>Get AI insights</strong>
          <p>AskSAV compares over time and highlights potential changes.</p>
        </div>
      </div>
    </div>
  );
}
