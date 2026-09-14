"use client";

import SiteFaceAccountButton from "./SiteFaceAccountButton";

import { useEffect, useMemo, useState } from "react";

type StoredAnalysis = {
  id: string;
  created_at: string;
  item_name: string;
  brand?: string | null;
  model?: string | null;
  identification_confidence?: number;
  verified?: boolean;
  condition?: string;
  condition_confidence?: number;
  market_available?: boolean;
  currency?: string;
  low?: number | null;
  high?: number | null;
  search_query?: string;
};

function pct(value?: number) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "—";
}

function money(value?: number | null, currency = "GBP") {
  if (typeof value !== "number") return "—";
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `£${Math.round(value)}`;
  }
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function ItemHistoryClient() {
  const [items, setItems] = useState<StoredAnalysis[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    document.documentElement.classList.add("sf1710-active");
    document.body.classList.add("sf1710-active");

    try {
      const raw = localStorage.getItem("siteface:item-history");
      const parsed = raw ? JSON.parse(raw) : [];
      setItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      setItems([]);
    }

    return () => {
      document.documentElement.classList.remove("sf1710-active");
      document.body.classList.remove("sf1710-active");
    };
  }, []);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.item_name, item.brand, item.model, item.condition, item.search_query]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, filter]);

  function clearHistory() {
    localStorage.removeItem("siteface:item-history");
    setItems([]);
  }

  return (
    <div className="sf1710-shell">
      <aside className="sf1710-sidebar">
        <a href="/" className="sf1710-brand">
          <span className="sf1710-logo">SAV</span>
          <span>
            <strong>AskSAV</strong>
            <small>Visual Intelligence</small>
          </span>
        </a>

        <a href="/analyse" className="sf1710-side-cta">＋ Analyse an item</a>

        <nav className="sf1710-side-nav">
          <a href="/"><span>⌂</span>Home</a>
          <a href="/analyse"><span>◉</span>Analyse</a>
          <a href="/history" className="active"><span>◷</span>History</a>
        </nav>

        <div className="sf1710-side-card">
          <span className="sf1710-bulb">◉</span>
          <div>
            <strong>Your visual history</strong>
            <p>Revisit items you have analysed and compare what AskSAV found.</p>
          </div>
        </div>

        <div className="sf1710-version">v0.17.10</div>
        <div className="sf1710-status">● All systems ready</div>
      </aside>

      <header className="sf1710-header">
        <nav>
          <a href="/">Home</a>
          <a href="/analyse">Analyse</a>
          <a href="/history" className="active">History</a>
        </nav>

        <div className="sf1710-header-actions">
          <div className="sf1710-mantra">◉ <span>See it. Know it. Value it.</span></div>
          <SiteFaceAccountButton />
        </div>
      </header>

      <main className="sf1710-main">
        <section className="sf1710-hero">
          <div>
            <span className="sf1710-kicker">YOUR ANALYSES</span>
            <h1>Item history</h1>
            <p>Every successful AskSAV analysis can be kept here so you can revisit identity, condition and value later.</p>
          </div>

          <div className="sf1710-hero-actions">
            <a href="/analyse" className="sf1710-primary">＋ Analyse a new item</a>
          </div>
        </section>

        <section className="sf1710-toolbar">
          <div className="sf1710-search">
            <span>⌕</span>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search item, brand, model or condition..."
            />
          </div>

          <div className="sf1710-summary">
            <span><strong>{items.length}</strong> saved analyses</span>
            {items.length > 0 && (
              <button type="button" onClick={clearHistory}>Clear history</button>
            )}
          </div>
        </section>

        {visible.length === 0 ? (
          <section className="sf1710-empty">
            <div className="sf1710-empty-art">
              <div className="sf1710-art one"></div>
              <div className="sf1710-art two"></div>
              <span>◷</span>
            </div>
            <span className="sf1710-kicker">NO ITEM HISTORY YET</span>
            <h2>Your analysed items will appear here.</h2>
            <p>Analyse an item and AskSAV will save a lightweight summary on this device so you can revisit the result.</p>
            <a href="/analyse" className="sf1710-primary">Analyse your first item</a>
          </section>
        ) : (
          <section className="sf1710-grid">
            {visible.map((item) => (
              <article key={item.id} className="sf1710-card">
                <div className="sf1710-card-top">
                  <div className="sf1710-item-icon">◎</div>
                  <div>
                    <span>{formatDate(item.created_at)}</span>
                    <h2>{item.item_name}</h2>
                    <p>{[item.brand, item.model].filter(Boolean).join(" · ") || "Brand/model not confirmed"}</p>
                  </div>
                </div>

                <div className="sf1710-badges">
                  <span className={item.verified ? "verified" : "review"}>
                    {item.verified ? "✓ Verified" : "Needs review"}
                  </span>
                  <span className="condition">{item.condition || "UNKNOWN"}</span>
                </div>

                <div className="sf1710-metrics">
                  <div>
                    <small>IDENTITY</small>
                    <strong>{pct(item.identification_confidence)}</strong>
                  </div>
                  <div>
                    <small>CONDITION</small>
                    <strong>{pct(item.condition_confidence)}</strong>
                  </div>
                  <div className="value">
                    <small>VALUE</small>
                    <strong>
                      {item.market_available
                        ? `${money(item.low, item.currency)}–${money(item.high, item.currency)}`
                        : "—"}
                    </strong>
                  </div>
                </div>

                <div className="sf1710-card-footer">
                  <span>{item.search_query || "Comparable search unavailable"}</span>
                  <a href="/analyse">Analyse again →</a>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
