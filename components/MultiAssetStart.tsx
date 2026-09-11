"use client";

import { useState } from "react";
import Link from "next/link";
import SubjectTypeSelector from "./SubjectTypeSelector";
import { INSPECTION_TEMPLATES, SubjectType } from "../lib/inspection-types";

function ComparisonVisual({ type }: { type: SubjectType }) {
  const isVehicle = type === "VEHICLE";

  return (
    <div className="sf143-visual" aria-label="Example AskSAV comparison">
      <div className="sf143-visual-head">
        <strong>Example comparison</strong>
        <span>AI assessed</span>
      </div>

      <div className="sf143-compare-row">
        <div className="sf143-photo-card">
          <span className="sf143-photo-label before">BEFORE</span>
          <div className={`sf143-scene ${isVehicle ? "vehicle" : "property"}`}>
            {isVehicle ? (
              <>
                <div className="sf143-car-body" />
                <div className="sf143-wheel left" />
                <div className="sf143-wheel right" />
              </>
            ) : (
              <>
                <div className="sf143-window">
                  <i /><i /><i /><i />
                </div>
                <div className="sf143-wall-line" />
              </>
            )}
          </div>
          <small>{isVehicle ? "Passenger door" : "Kitchen wall"}</small>
        </div>

        <div className="sf143-arrow">→</div>

        <div className="sf143-photo-card">
          <span className="sf143-photo-label current">CURRENT</span>
          <div className={`sf143-scene ${isVehicle ? "vehicle" : "property"}`}>
            {isVehicle ? (
              <>
                <div className="sf143-car-body" />
                <div className="sf143-wheel left" />
                <div className="sf143-wheel right" />
                <div className="sf143-damage vehicle-damage" />
              </>
            ) : (
              <>
                <div className="sf143-window">
                  <i /><i /><i /><i />
                </div>
                <div className="sf143-wall-line" />
                <div className="sf143-damage" />
              </>
            )}
          </div>
          <small>{isVehicle ? "Passenger door" : "Kitchen wall"}</small>
        </div>
      </div>

      <div className="sf143-result">
        <div className="sf143-result-icon">!</div>
        <div>
          <strong>Change detected</strong>
          <small>
            {isVehicle
              ? "Potential new panel damage identified for review."
              : "Potential surface staining identified for review."}
          </small>
        </div>
        <div className="sf143-confidence">
          <strong>91%</strong>
          <small>confidence</small>
        </div>
      </div>

      <div className="sf143-review">Review evidence →</div>
    </div>
  );
}

export default function MultiAssetStart() {
  const [type, setType] = useState<SubjectType>("PROPERTY");
  const template = INSPECTION_TEMPLATES[type];

  return (
    <div className="sf14-start sf143-start">
      <section className="sf143-hero">
        <div className="sf143-hero-copy">
          <div className="sf14-kicker">VISUAL CONDITION INTELLIGENCE</div>
          <h1>See what changed. Spot what needs attention.</h1>
          <p>
            AskSAV compares inspection evidence over time, helping you identify
            meaningful changes and keep an evidence-backed history of condition.
          </p>

          <div className="sf143-capabilities">
            <span>AI-assisted</span>
            <span>Evidence-led</span>
            <span>Human-reviewed</span>
          </div>
        </div>

        <ComparisonVisual type={type} />
      </section>

      <SubjectTypeSelector value={type} onChange={setType} />

      <div className="sf14-solution-preview">
        <div>
          <div className="sf14-kicker">
            {template.shortLabel.toUpperCase()} CONDITION INTELLIGENCE
          </div>
          <h3>
            {type === "PROPERTY"
              ? "Know what changed between property inspections."
              : "Know what changed between vehicle checkout and return."}
          </h3>
          <p>
            {type === "PROPERTY"
              ? "Build an evidence-backed history of rooms, surfaces and fixtures and identify meaningful deterioration over time."
              : "Compare vehicle condition before and after hire, distinguish existing from new damage and keep the evidence behind every assessment."}
          </p>
        </div>

        <Link
          className="btn primary sf14-start-button"
          href={type === "PROPERTY" ? "/properties/new" : "/vehicles/new"}
        >
          {type === "PROPERTY" ? "Register property" : "Register vehicle"}
        </Link>
      </div>

      <div className="sf14-template">
        <span>Example inspection structure</span>
        <div className="sf14-template-areas">
          {template.areas.slice(0, 3).map((area) => (
            <div key={area.name}>
              <strong>{area.name}</strong>
              <small>{area.items.slice(0, 4).join(" · ")}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
