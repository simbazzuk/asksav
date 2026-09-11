"use client";

import { useMemo, useState } from "react";

type GuidedEvidenceCaptureProps = {
  previousPreview?: string | null;
  currentPreview?: string | null;
  previousExists?: boolean;
  comparisonQuality?: string | null;
  confidence?: number | null;
  onRetake?: (() => void) | null;
};

function qualityScore(
  comparisonQuality?: string | null,
  confidence?: number | null
) {
  const q = String(comparisonQuality || "").toUpperCase();

  if (q === "HIGH" || q === "GOOD") return 90;
  if (q === "MEDIUM" || q === "PARTIAL" || q === "MODERATE") return 65;
  if (q === "LOW" || q === "POOR") return 35;

  if (typeof confidence === "number" && Number.isFinite(confidence)) {
    return Math.max(0, Math.min(100, Math.round(confidence * 100)));
  }

  return null;
}

function qualityLabel(score: number | null) {
  if (score == null) return "Not assessed";
  if (score >= 80) return "Good framing";
  if (score >= 50) return "Partial overlap";
  return "Low comparability";
}

export default function GuidedEvidenceCapture({
  previousPreview,
  currentPreview,
  previousExists,
  comparisonQuality,
  confidence,
  onRetake,
}: GuidedEvidenceCaptureProps) {
  const [opacity, setOpacity] = useState(50);

  const score = useMemo(
    () => qualityScore(comparisonQuality, confidence),
    [comparisonQuality, confidence]
  );

  const state =
    score == null ? "unknown" : score >= 80 ? "good" : score >= 50 ? "partial" : "low";

  if (!previousExists || !previousPreview) {
    return (
      <section className="sf13-guided-card baseline">
        <div className="sf13-guided-kicker">GUIDED EVIDENCE CAPTURE</div>
        <h3>Capture a clear baseline view</h3>
        <p>
          This is the first inspection for this item. Include useful fixed reference
          points such as corners, switches, windows, doors, skirting or fittings.
          AskSAV will use this evidence to guide future inspections.
        </p>
        <div className="sf13-capture-tips">
          <span>Keep the whole inspection area visible</span>
          <span>Avoid heavy zoom</span>
          <span>Include fixed reference features</span>
        </div>
      </section>
    );
  }

  return (
    <section className={`sf13-guided-card ${state}`}>
      <div className="sf13-guided-head">
        <div>
          <div className="sf13-guided-kicker">GUIDED EVIDENCE CAPTURE</div>
          <h3>Match the previous view where practical</h3>
          <p>
            It does not need to be exact. Try to include the same fixed features and
            roughly the same section of the room so AskSAV can make a stronger
            comparison.
          </p>
        </div>

        {score != null && (
          <div className={`sf13-quality-badge ${state}`}>
            <strong>{score}%</strong>
            <span>{qualityLabel(score)}</span>
          </div>
        )}
      </div>

      <div className="sf13-guidance-grid">
        <div className="sf13-guide-image">
          <span>Previous inspection reference</span>
          <img src={previousPreview} alt="Previous inspection reference" />
        </div>

        <div className="sf13-guide-copy">
          <strong>Try to match:</strong>
          <ul>
            <li>the same wall, floor, ceiling or fixture</li>
            <li>fixed features such as switches, sockets, windows and doors</li>
            <li>roughly the same distance and orientation</li>
          </ul>
          <p>
            Different framing is allowed. AskSAV should only make claims about
            areas visible in both images.
          </p>
        </div>
      </div>

      {currentPreview && (
        <>
          <div className="sf13-overlay-title">
            <div>
              <strong>Framing check</strong>
              <span>Use the slider to compare the new photo against the previous one.</span>
            </div>
            <span>{opacity}% current</span>
          </div>

          <div className="sf13-overlay">
            <img className="sf13-overlay-base" src={previousPreview} alt="Previous inspection" />
            <img
              className="sf13-overlay-current"
              src={currentPreview}
              alt="Current inspection"
              style={{ opacity: opacity / 100 }}
            />
          </div>

          <input
            className="sf13-opacity"
            type="range"
            min="0"
            max="100"
            value={opacity}
            onChange={(event) => setOpacity(Number(event.target.value))}
            aria-label="Current image opacity"
          />
        </>
      )}

      {score != null && score < 50 && (
        <div className="sf13-low-warning">
          <div>
            <strong>Low comparison quality</strong>
            <p>
              The images may show different sections or angles. Retaking the current
              photo with more overlap will give a more reliable change assessment.
            </p>
          </div>
          {onRetake && (
            <button type="button" className="btn secondary" onClick={onRetake}>
              Retake photo
            </button>
          )}
        </div>
      )}

      {score != null && score >= 50 && score < 80 && (
        <div className="sf13-partial-warning">
          <strong>Partial comparison</strong>
          <p>
            AskSAV should compare only the overlapping visible area and treat
            features outside the current frame as not assessable, rather than as
            removed or changed.
          </p>
        </div>
      )}
    </section>
  );
}
