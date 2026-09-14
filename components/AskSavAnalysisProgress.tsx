"use client";

import { useEffect, useRef, useState } from "react";

type Stage = {
  at: number;
  label: string;
  helper: string;
};

const STAGES: Stage[] = [
  { at: 8, label: "Uploading image", helper: "Preparing your photo for analysis" },
  { at: 22, label: "Identifying item", helper: "Looking for logos, model details and distinctive features" },
  { at: 38, label: "Verifying identity", helper: "Cross-checking what the item appears to be" },
  { at: 54, label: "Assessing condition", helper: "Reviewing visible wear, marks and condition clues" },
  { at: 70, label: "Estimating market value", helper: "Building an indicative UK market value" },
  { at: 84, label: "Finding comparable listings", helper: "Checking available market evidence" },
  { at: 93, label: "Preparing results", helper: "Bringing your AskSAV result together" },
];

function getStage(progress: number) {
  let current = STAGES[0];
  for (const stage of STAGES) {
    if (progress >= stage.at) current = stage;
  }
  return current;
}

function isAnalyseButton(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  const button = target.closest("button");
  if (!button) return false;
  const text = (button.textContent || "").trim().toLowerCase();
  return text.includes("analyse item") || text.includes("analyze item");
}

function resultsVisible() {
  const text = document.body.innerText.toLowerCase();
  return (
    text.includes("identified item") &&
    (text.includes("market value") || text.includes("condition"))
  );
}

export default function AskSavAnalysisProgress() {
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const hadResultsBeforeRef = useRef(false);

  useEffect(() => {
    const begin = (event: MouseEvent) => {
      if (!isAnalyseButton(event.target)) return;

      hadResultsBeforeRef.current = resultsVisible();
      startTimeRef.current = Date.now();
      setComplete(false);
      setProgress(5);
      setActive(true);
    };

    document.addEventListener("click", begin, true);
    return () => document.removeEventListener("click", begin, true);
  }, []);

  useEffect(() => {
    if (!active || complete) return;

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;

      // Aim for ~90% around 55 seconds, then creep to 94%.
      // Never show 100% until results actually arrive.
      const seconds = elapsed / 1000;
      let target =
        seconds < 5
          ? 5 + seconds * 3.0
          : seconds < 20
            ? 20 + (seconds - 5) * 1.25
            : seconds < 40
              ? 39 + (seconds - 20) * 1.15
              : seconds < 55
                ? 62 + (seconds - 40) * 1.7
                : 90 + Math.min(4, (seconds - 55) * 0.12);

      target = Math.min(94, target);

      setProgress((current) => Math.max(current, target));
      timerRef.current = window.setTimeout(tick, 650);
    };

    timerRef.current = window.setTimeout(tick, 650);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [active, complete]);

  useEffect(() => {
    if (!active || complete) return;

    const observer = new MutationObserver(() => {
      const nowHasResults = resultsVisible();

      // If the page already had an older result before this run, wait briefly
      // before allowing the result detector to complete this new run.
      const elapsed = Date.now() - startTimeRef.current;
      const canFinish = !hadResultsBeforeRef.current || elapsed > 2500;

      if (nowHasResults && canFinish) {
        setProgress(100);
        setComplete(true);

        window.setTimeout(() => {
          setActive(false);
          setComplete(false);
          setProgress(0);
        }, 900);
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });

    return () => observer.disconnect();
  }, [active, complete]);

  if (!active) return null;

  const stage = complete
    ? { label: "Analysis complete", helper: "Your AskSAV result is ready" }
    : getStage(progress);

  const rounded = Math.round(progress);

  return (
    <div className="asksav-analysis-progress-backdrop" role="status" aria-live="polite">
      <div className="asksav-analysis-progress-card">
        <div className="asksav-analysis-progress-orb" aria-hidden="true">
          {complete ? "✓" : "✦"}
        </div>

        <div className="asksav-analysis-progress-kicker">
          {complete ? "COMPLETE" : "SMART AI VISION"}
        </div>

        <h2>{complete ? "Analysis complete" : "Analysing your item"}</h2>

        <p className="asksav-analysis-progress-stage">{stage.label}</p>
        <p className="asksav-analysis-progress-helper">{stage.helper}</p>

        <div
          className="asksav-analysis-progress-track"
          aria-label={`Analysis progress ${rounded}%`}
        >
          <div
            className="asksav-analysis-progress-fill"
            style={{ width: `${rounded}%` }}
          />
        </div>

        <div className="asksav-analysis-progress-meta">
          <strong>{rounded}%</strong>
          <span>{complete ? "Done" : "Usually takes around 30–60 seconds"}</span>
        </div>

        {!complete && (
          <div className="asksav-analysis-progress-steps" aria-hidden="true">
            <span className={rounded >= 22 ? "done" : ""}>Identify</span>
            <span className={rounded >= 38 ? "done" : ""}>Verify</span>
            <span className={rounded >= 54 ? "done" : ""}>Condition</span>
            <span className={rounded >= 70 ? "done" : ""}>Value</span>
            <span className={rounded >= 84 ? "done" : ""}>Evidence</span>
          </div>
        )}
      </div>
    </div>
  );
}
