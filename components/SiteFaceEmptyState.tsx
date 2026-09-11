"use client";

import Link from "next/link";

type Props = {
  eyebrow?: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export default function AskSAVEmptyState({
  eyebrow = "GET STARTED",
  title,
  description,
  actionLabel,
  actionHref,
  secondaryLabel,
  secondaryHref,
}: Props) {
  return (
    <section className="sf121-empty-state">
      <div className="sf121-empty-icon" aria-hidden="true">
        ◫
      </div>

      <div className="sf121-empty-copy">
        <div className="sf121-eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        <p>{description}</p>

        {(actionLabel || secondaryLabel) && (
          <div className="sf121-empty-actions">
            {actionLabel && actionHref && (
              <Link className="btn" href={actionHref}>
                {actionLabel}
              </Link>
            )}

            {secondaryLabel && secondaryHref && (
              <Link className="btn secondary" href={secondaryHref}>
                {secondaryLabel}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
