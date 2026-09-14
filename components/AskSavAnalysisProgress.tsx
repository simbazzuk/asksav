"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Stage = {
  at: number;
  label: string;
  detail: string;
};

const STAGES: Stage[] = [
  { at: 0, label: "Uploading image", detail: "Preparing your photo for analysis" },
  { at: 8, label: "Identifying item", detail: "Looking for logos, model details and distinctive features" },
  { at: 20, label: "Verifying identity", detail: "Cross-checking what the item appears to be" },
  { at: 32, label: "Assessing condition", detail: "Reviewing visible wear, damage and overall condition" },
  { at: 44, label: "Estimating market value", detail: "Calculating an indicative market range" },
  { at: 58, label: "Finding comparable listings", detail: "Looking for relevant marketplace evidence" },
  { at: 74, label: "Preparing results", detail: "Bringing your AskSAV analysis together" },
];

function findAnalyseButton(): HTMLButtonElement | null {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));

  return (
    buttons.find((button) => {
      const text = (button.textContent || "").trim().toLowerCase();
      return (
        text.includes("analysing item") ||
        text.includes("analyzing item") ||
        button.getAttribute("aria-busy") === "true"
      );
    }) || null
  );
}

export default function AskSavAnalysisProgress() {
  const [active, setActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    const sync = () => {
      const analysing = Boolean(findAnalyseButton());

      if (analysing) {
        if (startedAtRef.current === null) {
          startedAtRef.current = Date.now();
          setElapsedSeconds(0);
        }

        setActive(true);
        setElapsedSeconds(
          Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000))
        );
      } else {
        setActive(false);
        startedAtRef.current = null;
        setElapsedSeconds(0);
      }
    };

    sync();

    const interval = window.setInterval(sync, 250);
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["disabled", "aria-busy"],
    });

    return () => {
      window.clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  const progress = useMemo(() => {
    // Gradually approaches 94% over ~75 seconds and never reaches 100%
    // until the real request completes and the analysing button returns to normal.
    const raw = 8 + elapsedSeconds * 1.15;
    return Math.min(94, Math.round(raw));
  }, [elapsedSeconds]);

  const stage = useMemo(() => {
    let current = STAGES[0];
    for (const candidate of STAGES) {
      if (elapsedSeconds >= candidate.at) current = candidate;
    }
    return current;
  }, [elapsedSeconds]);

  if (!active) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="AskSAV analysis progress"
      style={{
        position: "fixed",
        left: "50%",
        bottom: "24px",
        transform: "translateX(-50%)",
        zIndex: 2147483647,
        width: "min(560px, calc(100vw - 32px))",
        borderRadius: "18px",
        background: "rgba(255,255,255,0.98)",
        border: "1px solid rgba(15, 118, 110, 0.18)",
        boxShadow: "0 18px 55px rgba(15, 23, 42, 0.22)",
        padding: "18px 20px",
        color: "#0f172a",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          alignItems: "baseline",
          marginBottom: "8px",
        }}
      >
        <strong style={{ fontSize: "16px", lineHeight: 1.3 }}>
          {stage.label}
        </strong>
        <span
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#475569",
            whiteSpace: "nowrap",
          }}
        >
          {progress}%
        </span>
      </div>

      <div
        style={{
          fontSize: "14px",
          lineHeight: 1.45,
          color: "#475569",
          marginBottom: "14px",
        }}
      >
        {stage.detail}
      </div>

      <div
        style={{
          height: "10px",
          borderRadius: "999px",
          overflow: "hidden",
          background: "#e2e8f0",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            borderRadius: "999px",
            background:
              "linear-gradient(90deg, #14b8a6 0%, #3b82f6 52%, #8b5cf6 100%)",
            transition: "width 450ms ease",
          }}
        />
      </div>

      <div
        style={{
          marginTop: "10px",
          fontSize: "12px",
          lineHeight: 1.4,
          color: "#64748b",
        }}
      >
        AskSAV is still working. You can stay on this page while the analysis completes.
      </div>
    </div>
  );
}
