"use client";

import { useState } from "react";
import { INSPECTION_TEMPLATES, SubjectType } from "../lib/inspection-types";

type SubjectTypeSelectorProps = {
  value?: SubjectType;
  onChange?: (value: SubjectType) => void;
  compact?: boolean;
};

export default function SubjectTypeSelector({
  value = "PROPERTY",
  onChange,
  compact = false,
}: SubjectTypeSelectorProps) {
  const [selected, setSelected] = useState<SubjectType>(value);

  function choose(type: SubjectType) {
    setSelected(type);
    onChange?.(type);
  }

  return (
    <section className={`sf14-selector ${compact ? "compact" : ""}`}>
      <div className="sf14-selector-head">
        <div className="sf14-kicker">INSPECTION TYPE</div>
        <h2>What would you like to inspect?</h2>
        <p>
          Choose an inspection type. AskSAV uses the same evidence and comparison
          engine with a workflow tailored to the asset.
        </p>
      </div>

      <div className="sf14-choice-grid">
        {(["PROPERTY", "VEHICLE"] as SubjectType[]).map((type) => {
          const template = INSPECTION_TEMPLATES[type];
          const active = selected === type;

          return (
            <button
              key={type}
              type="button"
              className={`sf14-choice ${active ? "active" : ""}`}
              onClick={() => choose(type)}
              aria-pressed={active}
            >
              <span className="sf14-choice-icon">{template.icon}</span>
              <span className="sf14-choice-copy">
                <strong>{template.label}</strong>
                <small>{template.description}</small>
              </span>
              <span className="sf14-choice-check">{active ? "Selected" : "Choose"}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
