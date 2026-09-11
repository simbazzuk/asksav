"use client";

type JourneyStep = {
  label: string;
  state?: "complete" | "current" | "upcoming";
};

export default function AskSAVJourneyStrip({
  steps = [
    { label: "Property", state: "complete" },
    { label: "Inspection", state: "current" },
    { label: "Findings", state: "upcoming" },
    { label: "Review", state: "upcoming" },
    { label: "History", state: "upcoming" },
  ],
}: {
  steps?: JourneyStep[];
}) {
  return (
    <div className="sf121-journey-strip" aria-label="AskSAV journey">
      {steps.map((step, index) => (
        <div
          key={`${step.label}-${index}`}
          className={`sf121-journey-step ${step.state ?? "upcoming"}`}
        >
          <span className="sf121-journey-dot">
            {step.state === "complete" ? "✓" : index + 1}
          </span>
          <span>{step.label}</span>
        </div>
      ))}
    </div>
  );
}
