"use client";

import { useState } from "react";
import { getSiteFaceAuth } from "../lib/siteface-auth";

type Props = {
  analysis: Record<string, unknown>;
};

type MarketRecord = Record<string, any>;

function asObject(value: unknown): MarketRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as MarketRecord)
    : null;
}

function hasMarketFields(value: unknown): value is MarketRecord {
  const item = asObject(value);
  if (!item) return false;

  return [
    "low",
    "high",
    "suggested",
    "quick_sale",
    "confidence",
    "evidence_summary",
    "search_query",
  ].some((key) => item[key] !== undefined && item[key] !== null);
}

/**
 * The server-side market generator has evolved over several AskSAV patches.
 * Normalize the response here instead of coupling the UI to one historical
 * envelope shape.
 */
function normalizeMarketPayload(value: unknown): MarketRecord | null {
  const root = asObject(value);
  if (!root) return null;

  const queue: unknown[] = [
    root,
    root.market,
    root.market_value,
    root.marketValue,
    root.market_intelligence,
    root.marketIntelligence,
    root.result,
    root.data,
  ];

  const visited = new Set<unknown>();

  while (queue.length) {
    const candidate = queue.shift();

    if (!candidate || visited.has(candidate)) continue;
    visited.add(candidate);

    if (hasMarketFields(candidate)) {
      return candidate;
    }

    const obj = asObject(candidate);
    if (!obj) continue;

    for (const key of [
      "market",
      "market_value",
      "marketValue",
      "market_intelligence",
      "marketIntelligence",
      "result",
      "data",
      "value",
      "valuation",
    ]) {
      if (obj[key] !== undefined) queue.push(obj[key]);
    }
  }

  return root;
}

function currencyPrefix(currency: unknown) {
  const code = String(currency || "GBP").toUpperCase();
  if (code === "GBP") return "£";
  if (code === "EUR") return "â‚¬";
  if (code === "USD") return "$";
  return "";
}

function money(value: unknown, currency: unknown) {
  if (value === null || value === undefined || value === "") return "—";

  const numberValue = Number(value);
  const formatted = Number.isFinite(numberValue)
    ? new Intl.NumberFormat("en-GB", {
        maximumFractionDigits: Number.isInteger(numberValue) ? 0 : 2,
      }).format(numberValue)
    : String(value);

  return `${currencyPrefix(currency)}${formatted}`;
}

function confidenceText(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);

  const percentage = numeric <= 1 ? numeric * 100 : numeric;
  return `${Math.round(percentage)}%`;
}

export default function AskSAVMarketIntelligenceButton({ analysis }: Props) {
  const [working, setWorking] = useState(false);
  const [market, setMarket] = useState<MarketRecord | null>(null);
  const [error, setError] = useState("");

  async function runMarketIntelligence() {
    if (working) return;

    setWorking(true);
    setError("");

    try {
      const user = getSiteFaceAuth().currentUser;

      if (!user) {
        throw new Error("Sign in to run Market Intelligence.");
      }

      const token = await user.getIdToken();

      const response = await fetch("/api/v20/market-intelligence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ analysis }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.message ||
            payload?.error ||
            "Unable to generate Market Intelligence.",
        );
      }

      const normalized = normalizeMarketPayload(
        payload?.market ?? payload?.result ?? payload,
      );

      if (!normalized) {
        throw new Error(
          "Market research completed but AskSAV could not read the valuation result.",
        );
      }

      console.info("[AskSAV market] normalized client result", {
        available: normalized.available,
        reason: normalized.reason,
        hasLow: normalized.low != null,
        hasHigh: normalized.high != null,
        hasSuggested: normalized.suggested != null,
        hasEvidence: Boolean(normalized.evidence_summary),
      });

      setMarket(normalized);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate Market Intelligence.",
      );
    } finally {
      setWorking(false);
    }
  }

  if (market) {
    const currency = market.currency || "GBP";
    const confidence = confidenceText(market.confidence);
    const hasRange = market.low != null || market.high != null;
    const unavailable =
      market.available === false &&
      !hasRange &&
      market.suggested == null &&
      !market.evidence_summary;

    return (
      <section
        className="asksav-market-demand asksav-market-demand--result asksav-market-wide"
        data-asksav-market-result="true"
      >
        <div className="asksav-market-demand__header">
          <div>
            <span className="asksav-market-demand__eyebrow">
              MARKET INTELLIGENCE
            </span>
            <h3>
              {unavailable ? "Market estimate unavailable" : "Market research complete"}
            </h3>
            <p>
              {market.evidence_summary ||
                market.reason ||
                "AskSAV completed the optional market research for this item."}
            </p>
          </div>

          {hasRange && (
            <div className="asksav-market-demand__headline-value">
              <strong>
                {money(market.low, currency)}
                <span> – </span>
                {money(market.high, currency)}
              </strong>
              <small>Estimated market range</small>
            </div>
          )}
        </div>

        {!unavailable && (
          <div className="asksav-market-demand__metrics">
            <div>
              <span>Suggested value</span>
              <strong>{money(market.suggested, currency)}</strong>
            </div>
            <div>
              <span>Quick sale</span>
              <strong>{money(market.quick_sale, currency)}</strong>
            </div>
            <div>
              <span>Confidence</span>
              <strong>{confidence || "—"}</strong>
            </div>
          </div>
        )}

        {market.search_query && (
          <div className="asksav-market-demand__query">
            <span>Market search</span>
            <strong>{String(market.search_query)}</strong>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="asksav-market-demand" data-asksav-market-cta="true">
      <div className="asksav-market-optional-wide asksav-market-banner-v382">
        <span className="asksav-market-demand__eyebrow asksav-market-optional-wide">
          OPTIONAL MARKET INTELLIGENCE
        </span>
        <h3>Want to know what it may be worth?</h3>
        <p>
          Your visual analysis is complete. Run optional market research for
          indicative UK pricing, likely selling range and supporting market
          evidence.
        </p>
      </div>

      <button
        type="button"
        onClick={runMarketIntelligence}
        disabled={working}
      >
        {working ? "Researching market..." : "Get Market Intelligence"}
      </button>

        <div className="asksav-market-benefits" aria-label="Market Intelligence benefits">
          <div className="asksav-market-benefit">
            <span className="asksav-market-benefit-icon" aria-hidden="true">&#8981;</span>
            <strong>UK market data</strong>
            <span>See current marketplace listings</span>
          </div>
          <div className="asksav-market-benefit">
            <span className="asksav-market-benefit-icon asksav-market-benefit-bars" aria-hidden="true">&#9645;</span>
            <strong>Estimated value</strong>
            <span>Indicative selling range and quick sale price</span>
          </div>
          <div className="asksav-market-benefit">
            <span className="asksav-market-benefit-icon" aria-hidden="true">&#10003;</span>
            <strong>Supporting evidence</strong>
            <span>Comparable items and recent sales</span>
          </div>
        </div>

      {working && (
        <div className="asksav-market-demand__loading" aria-live="polite">
          <span className="asksav-market-demand__spinner" aria-hidden="true" />
          <p>Checking current market context. This may take a little longer.</p>
        </div>
      )}

      {error && (
        <p className="asksav-market-demand__error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}