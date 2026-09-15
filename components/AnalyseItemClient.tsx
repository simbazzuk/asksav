"use client";

import SiteFaceAccountButton from "./SiteFaceAccountButton";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { firebaseConfigured, getSiteFaceAuth } from "../lib/siteface-auth";
import AskSAVMarketIntelligenceButton from "./AskSAVMarketIntelligenceButton";
import AskSAVAnalyseCredits from "./AskSAVAnalyseCredits";

function askSavLegacyMarketIsOnDemand(result: any) {
  const market =
    result?.market_value ??
    result?.marketValue ??
    result?.market_intelligence ??
    result?.marketIntelligence ??
    result?.market;

  return market?.reason === "ON_DEMAND";
}
type AskSAVRuntimeEntitlements = {
  plan: "FREE" | "VIC_PLUS" | "VIC_PRO";
  entitlements: {
    monthlyAnalyses: number | "FAIR_USE";
    savedItems: number | "UNLIMITED";
    fullMarketEvidence: boolean;
    valueHistory: boolean;
    valueAlerts: boolean;
    sellingTools: "NONE" | "LIMITED" | "FULL";
  };
  usage: {
    analysesUsed: number;
    analysesLimit: number | "FAIR_USE";
    remaining: number | "FAIR_USE";
    periodKey: string;
  };
};

type Result = {
  _asksav?: AskSAVRuntimeEntitlements;
  identification?: {
    item_name?: string;
    brand?: string | null;
    model?: string | null;
    variant?: string | null;
    confidence?: number;
    identifying_features?: string[];
  };
  verification?: {
    verified?: boolean;
    reason?: string;
  };
  condition?: {
    grade?: string;
    confidence?: number;
    summary?: string;
    visible_wear?: string[];
    visible_damage?: string[];
    limitations?: string[];
  };
  valuation_context?: {
    search_query?: string;
  };
  market?: {
    available?: boolean;
    reason?: string | null;
    currency?: string;
    low?: number | null;
    high?: number | null;
    suggested?: number | null;
    quick_sale?: number | null;
    confidence?: number;
    evidence_summary?: string | null;
    search_query?: string;
  };
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

function marketplaceLinks(query: string) {
  const q = encodeURIComponent(query);
  return [
    { label: "eBay UK", href: `https://www.ebay.co.uk/sch/i.html?_nkw=${q}`, kind: "ebay" },
    { label: "Google Shopping", href: `https://www.google.com/search?tbm=shop&q=${q}`, kind: "google" },
    { label: "Gumtree", href: `https://www.gumtree.com/search?search_category=all&q=${q}`, kind: "gumtree" },
  ];
}

function MarketplaceIcon({ kind }: { kind: string }) {
  if (kind === "ebay") {
    return (
      <span className="sf-market-icon ebay" aria-hidden="true">
        <svg viewBox="0 0 64 28" role="img">
          <text x="1" y="22" fontSize="24" fontWeight="700" fontFamily="Arial, Helvetica, sans-serif" fill="#e53238">e</text>
          <text x="15" y="22" fontSize="24" fontWeight="700" fontFamily="Arial, Helvetica, sans-serif" fill="#0064d2">b</text>
          <text x="30" y="22" fontSize="24" fontWeight="700" fontFamily="Arial, Helvetica, sans-serif" fill="#f5af02">a</text>
          <text x="45" y="22" fontSize="24" fontWeight="700" fontFamily="Arial, Helvetica, sans-serif" fill="#86b817">y</text>
        </svg>
      </span>
    );
  }

  if (kind === "google") {
    return (
      <span className="sf-market-icon google" aria-hidden="true">
        <svg viewBox="0 0 32 32" role="img">
          <path d="M16 5a11 11 0 1 0 0 22c6.1 0 10.4-4.3 10.4-10.3 0-.7-.1-1.4-.2-2H16v4.1h5.9c-.7 2.8-3.1 4.4-5.9 4.4a7.2 7.2 0 0 1 0-14.4c1.7 0 3.2.6 4.3 1.7l3.1-3.1A10.8 10.8 0 0 0 16 5Z" fill="#4285F4"/>
          <path d="M7.3 10.9 10.8 13A6.9 6.9 0 0 1 16 8.8c1.7 0 3.2.6 4.3 1.7l3.1-3.1A10.8 10.8 0 0 0 16 5a11 11 0 0 0-8.7 5.9Z" fill="#EA4335"/>
          <path d="M16 27c3 0 5.6-1 7.5-2.8l-3.5-2.9a6.5 6.5 0 0 1-9.2-2.4l-3.5 2.1A11 11 0 0 0 16 27Z" fill="#34A853"/>
          <path d="M10.8 18.9a7.1 7.1 0 0 1 0-5.8l-3.5-2.2a11 11 0 0 0 0 10.1l3.5-2.1Z" fill="#FBBC05"/>
        </svg>
      </span>
    );
  }

  return (
    <span className="sf-market-icon gumtree" aria-hidden="true">
      <svg viewBox="0 0 32 32" role="img">
        <circle cx="16" cy="16" r="15" fill="#4f2d7f"/>
        <path d="M16 7c-2.6 0-4.7 2-4.7 4.5 0 1.2.5 2.3 1.3 3.1-2.2.9-3.7 3-3.7 5.5h4.4v4.9h5.4v-4.9h4.4c0-2.5-1.5-4.6-3.7-5.5.8-.8 1.3-1.9 1.3-3.1C20.7 9 18.6 7 16 7Z" fill="#fff"/>
      </svg>
    </span>
  );
}

function persistAskSAVHistory(payload: any) {
  try {
    const record = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      item_name: payload?.identification?.item_name || "Analysed item",
      brand: payload?.identification?.brand || null,
      model: payload?.identification?.model || null,
      identification_confidence: payload?.identification?.confidence ?? 0,
      verified: Boolean(payload?.verification?.verified),
      condition: payload?.condition?.grade || "UNKNOWN",
      condition_confidence: payload?.condition?.confidence ?? 0,
      market_available: Boolean(payload?.market?.available),
      currency: payload?.market?.currency || "GBP",
      low: payload?.market?.low ?? null,
      high: payload?.market?.high ?? null,
      search_query:
        payload?.market?.search_query ||
        payload?.valuation_context?.search_query ||
        payload?.identification?.item_name ||
        "",
    };

    const key = "siteface:item-history";
    const existingRaw = localStorage.getItem(key);
    const existing = existingRaw ? JSON.parse(existingRaw) : [];
    const next = [record, ...(Array.isArray(existing) ? existing : [])].slice(0, 30);
    localStorage.setItem(key, JSON.stringify(next));
  } catch (error) {
    console.warn("[AskSAV] Unable to persist local item history:", error);
  }
}
function MarketEvidencePanel({ evidence }: { evidence: any }) {
  if (!evidence) return null;

  const money = (value: any, currency = "GBP") => {
    if (typeof value !== "number") return "â€”";
    try {
      return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `Â£${value.toFixed(2)}`;
    }
  };

  const items = Array.isArray(evidence.comparables) ? evidence.comparables : [];

  return (
    <div className="sf-market-evidence">
      <div className="sf-market-evidence__top">
        <div>
          <p className="sf-market-evidence__eyebrow">Market evidence</p>
          <h3 className="sf-market-evidence__title">Comparable listings</h3>
          <div className="sf-market-evidence__summary">
            {evidence.comparable_count || 0} grounded comparable
            {(evidence.comparable_count || 0) === 1 ? "" : "s"} found.
          </div>
        </div>
        <span className="sf-market-evidence__confidence">
          {evidence.confidence || "LOW"} CONFIDENCE
        </span>
      </div>

      {evidence.available ? (
        <>
                    <div className="sf-evidence-led-summary">
            <p className="sf-evidence-led-summary__label">Evidence-led valuation</p>
            <div className="sf-evidence-led-summary__main">
              <span className="sf-evidence-led-summary__range">
                {money(evidence.low, evidence.currency)} - {money(evidence.high, evidence.currency)}
              </span>
              <span className="sf-evidence-led-summary__typical">
                Typical value {money(evidence.typical, evidence.currency)}
              </span>
            </div>
            <div className="sf-evidence-led-summary__note">
              Based on {evidence.comparable_count || 0} grounded comparable
              {(evidence.comparable_count || 0) === 1 ? "" : "s"}.
              This evidence should be treated as the primary pricing signal when enough relevant listings are available.
            </div>
          </div>
<div className="sf-market-evidence__stats">
            <div className="sf-market-evidence__stat">
              <small>Evidence low</small>
              <strong>{money(evidence.low, evidence.currency)}</strong>
            </div>
            <div className="sf-market-evidence__stat">
              <small>Typical</small>
              <strong>{money(evidence.typical, evidence.currency)}</strong>
            </div>
            <div className="sf-market-evidence__stat">
              <small>Evidence high</small>
              <strong>{money(evidence.high, evidence.currency)}</strong>
            </div>
          </div>

          <div className="sf-market-evidence__list">
            {items.map((item: any, index: number) => (
              <a
                className="sf-market-evidence__item"
                href={item.url}
                target="_blank"
                rel="noreferrer"
                key={`${item.url}-${index}`}
              >
                <div className="sf-market-evidence__source">{item.marketplace}</div>
                <div className="sf-market-evidence__price">
                  {money(item.price, item.currency)}
                </div>
                <div className="sf-market-evidence__item-title">{item.title}</div>
              </a>
            ))}
          </div>
        </>
      ) : (
        <div className="sf-market-evidence__empty">
          No reliable marketplace comparables were returned for this item.
        </div>
      )}

      <p className="sf-market-evidence__note">
        {evidence.note}
      </p>
    </div>
  );
}

function AskSAVActionLayer({ query }: { query: string }) {
  const q = encodeURIComponent(query || "similar item");

  const actions = [
    {
      key: "sell",
      title: "Sell this",
      description: "See comparable listings and decide where to sell.",
      href: `https://www.ebay.co.uk/sch/i.html?_nkw=${q}`,
      icon: "\u00a3",
      cta: "View selling options",
    },
    {
      key: "replace",
      title: "Replace or upgrade",
      description: "Compare alternatives if you want something better.",
      href: `https://www.google.com/search?tbm=shop&q=${q}`,
      icon: "\u2191",
      cta: "View alternatives",
    },
    {
      key: "similar",
      title: "Find similar",
      description: "Explore similar used items currently on the market.",
      href: `https://www.gumtree.com/search?search_category=all&q=${q}`,
      icon: "\u2248",
      cta: "View similar items",
    },
  ];

  return (
    <section className="sf-action-layer" aria-label="Next actions">
      <div className="sf-action-layer__header">
        <span className="sf-action-layer__hero-icon" aria-hidden="true">{"\u2197"}</span>
        <div>
          <p className="sf-action-layer__eyebrow">Next step</p>
          <h3 className="sf-action-layer__title">What would you like to do?</h3>
          <p className="sf-action-layer__intro">
            AskSAV has understood the item. Use that intelligence to take the next step.
          </p>
        </div>
      </div>

      <div className="sf-action-grid">
        {actions.map((action) => (
          <a
            key={action.key}
            className={`sf-action-card sf-action-card--${action.key}`}
            href={action.href}
            target="_blank"
            rel="noreferrer"
          >
            <span className="sf-action-card__icon" aria-hidden="true">{action.icon}</span>
            <span className="sf-action-card__copy">
              <span className="sf-action-card__title">{action.title}</span>
              <span className="sf-action-card__description">{action.description}</span>
            </span>
            <span className="sf-action-card__cta">
              {action.cta}
              <span aria-hidden="true">{"\u2192"}</span>
            </span>
          </a>
        ))}
      </div>

      <div className="sf-action-layer__notice">
        <span className="sf-action-layer__notice-icon" aria-hidden="true">i</span>
        <span>
          Marketplace results open in a new tab. AskSAV does not currently receive commission from these links.
        </span>
      </div>
    </section>
  );
}


function askSavFriendlyAnalysisError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  if (
    /ANALYSIS_TIMEOUT/i.test(raw) ||
    /taking longer than expected/i.test(raw) ||
    /timed out/i.test(raw) ||
    /timeout/i.test(raw)
  ) {
    return "AskSAV is taking longer than expected. Please try again with a clearer or closer image.";
  }
  if (
    /string did not match the expected pattern/i.test(raw) ||
    /invalid url/i.test(raw) ||
    /failed to parse url/i.test(raw) ||
    /unexpected token.*json/i.test(raw) ||
    /json.*parse/i.test(raw)
  ) {
    return "AskSAV could not interpret the analysis response for this image. Try again, or use a closer photo of the item.";
  }

  if (/network|failed to fetch|load failed/i.test(raw)) {
    return "AskSAV could not reach the analysis service. Please check your connection and try again.";
  }

  return raw || "AskSAV could not analyse this image. Please try again.";
}
export default function AnalyseItemClient() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAuthGate, setShowAuthGate] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("sf178-active");
    document.body.classList.add("sf178-active");

    return () => {
      document.documentElement.classList.remove("sf178-active");
      document.body.classList.remove("sf178-active");
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const searchQuery =
    result?.market?.search_query ||
    result?.valuation_context?.search_query ||
    result?.identification?.item_name ||
    "used item";

  const links = useMemo(() => marketplaceLinks(searchQuery), [searchQuery]);

  function chooseFile(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0] ?? null;
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : null);
    setResult(null);
    setError("");
  }

  async function analyse(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (firebaseConfigured() && !getSiteFaceAuth().currentUser) {
      setShowAuthGate(true);
      return;
    }
    if (!file) {
      setError("Choose a photo first.");
      return;
    }

    const user = firebaseConfigured() ? getSiteFaceAuth().currentUser : null;
    if (!user) {
      setError("Sign in to analyse an item. Your plan and monthly allowance are now protected by your account.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const form = new FormData(e.currentTarget);
    form.set("image", file);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/v20/analyse-item", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        body: form,
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Analysis failed.");
      setResult(payload);
      persistAskSAVHistory(payload);
    } catch (e) {
      setError(askSavFriendlyAnalysisError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sf178-shell">
      {showAuthGate && (
        <div
          className="sf20-auth-gate-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sf20-auth-gate-title"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setShowAuthGate(false);
          }}
        >
          <section className="sf20-auth-gate">
            <div className="sf20-auth-gate__icon" aria-hidden="true">SAV</div>
            <p className="sf20-auth-gate__eyebrow">Your analysis is ready to start</p>
            <h2 id="sf20-auth-gate-title">Create a free account to ask SAV</h2>
            <p className="sf20-auth-gate__copy">
              Sign in or create your free AskSAV account to analyse this item,
              keep your results and build your item history.
            </p>
            <div className="sf20-auth-gate__allowance">
              <span aria-hidden="true">&#10003;</span>
              5 free analyses each month
            </div>

            <div className="sf20-auth-gate__actions">
              <a
                className="sf20-auth-gate__primary"
                href="/login?create=1&next=/analyse"
              >
                Create free account
              </a>
              <a
                className="sf20-auth-gate__secondary"
                href="/login?next=/analyse"
              >
                Sign in
              </a>
            </div>

            <button
              className="sf20-auth-gate__later"
              type="button"
              onClick={() => setShowAuthGate(false)}
            >
              Not now
            </button>
          </section>
        </div>
      )}
      <aside className="sf178-sidebar">
        <a href="/" className="sf178-brand">
          <span className="sf178-logo">SAV</span>
          <span>
            <strong>AskSAV</strong>
            <small>Visual Intelligence</small>
          </span>
        </a>

        <a href="/analyse" className="sf178-side-cta">＋ Analyse an item</a>

        <nav className="sf178-side-nav">
          <a href="/"><span>⌂</span>Home</a>
          <a href="/analyse" className="active"><span>◉</span>Analyse</a>
          <a href="/history"><span>◷</span>History</a>
        </nav>

        <div className="sf178-side-card">
          <span className="sf178-bulb">◉</span>
          <div>
            <strong>See it. Know it.<br />Value it.</strong>
            <p>Visual intelligence for the things you own and discover.</p>
          </div>
        </div>

        <div className="sf178-version">v0.17.8</div>
        <div className="sf178-status">● All systems ready</div>
      </aside>

      <header className="sf178-header">
        <nav>
          <a href="/">Home</a>
          <a href="/analyse" className="active">Analyse</a>
          <a href="/history">History</a>
        </nav>

        <div className="sf178-header-actions">
          <div className="sf178-mantra">◉ <span>See it. Know it. Value it.</span></div>
          <SiteFaceAccountButton />
        </div>
      </header>

      <main className="sf178-main">
        <div className="asksav-analyse-credit-row-v020394">
          <AskSAVAnalyseCredits />
        </div>
        <section className="sf178-hero">
          <div className="sf178-hero-copy">
            <span className="sf178-kicker">VISUAL INTELLIGENCE</span>
            <h1>See it. <span>Know it.</span> <em>Value it.</em></h1>
            <p>Upload one photo and AskSAV turns it into a verified item report with condition and market insight.</p>
          </div>

          <div className="sf178-object-strip" aria-hidden="true">
            <div className="blue">⌚</div>
            <div className="sand">🪑</div>
            <div className="mint">👟</div>
            <div className="pink">👜</div>
            <div className="violet">🎧</div>
            <div className="blue">💻</div>
          </div>
        </section>

        <section className="sf178-flow">
          {[
            ["🔎","Identify","What is it?","blue"],
            ["🛡","Verify","Can we trust it?","green"],
            ["⚙","Condition","What's the state?","amber"],
            ["£","Value","What's it worth?","violet"],
            ["◫","Discover","Find similar","purple"],
          ].map(([icon,title,sub,tone], i) => (
            <article key={title} className={`sf178-flow-card ${tone}`}>
              <span className="sf178-flow-icon">{icon}</span>
              <div><strong>{title}</strong><small>{sub}</small></div>
              {i < 4 && <b>→</b>}
            </article>
          ))}
        </section>

        <section className="sf178-workspace">
          <form className="sf178-upload-card" onSubmit={analyse}>
            <div className="sf178-card-title">
              <span className="sf178-title-icon">📷</span>
              <div>
                <h2>Upload a photo</h2>
                <p>Show the full item where possible. Labels and logos help with exact identification.</p>
              </div>
            </div>

            <label className={`sf178-dropzone ${preview ? "has-image" : ""}`}>
              {preview ? (
                <img src={preview} alt="Selected item" />
              ) : (
                <div className="sf178-drop-inner">
                  <span className="sf178-upload-icon">🖼</span>
                  <strong>Drop, browse or take a photo</strong>
                  <small>JPG, PNG or WebP · Up to 10 MB</small>
                </div>
              )}
              <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={chooseFile} />
            </label>

            <div className="sf178-or">or</div>

            <div className="sf178-file-buttons">
              <label className="secondary">📷 Take a photo<input type="file" accept="image/*" capture="environment" onChange={chooseFile} /></label>
              <label className="primary">⇧ Choose a file<input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFile} /></label>
            </div>

            <label className="sf178-hint">
              <span>◇</span>
              <input name="hint" placeholder="Anything you already know? (Optional)  e.g. A4Tech keyboard, office chair, Samsung TV..." />
            </label>

            <div className="sf178-tips">
              <span>✓ Show the full item</span>
              <span>✓ Include logos or labels</span>
              <span>✓ Good lighting</span>
            </div>

            <button className="sf178-analyse-button" disabled={!file || loading}>
              ✦ {loading ? "Analysing item..." : "Analyse item"}
            </button>

            {error && <div className="sf178-error">{error}</div>}
          </form>

          <section className="sf178-report">
            {!result ? (
              <>
                <div className="sf178-report-title">
                  <span className="sf178-report-title-icon">▤</span>
                  <div>
                    <strong>Your visual intelligence report</strong>
                    <small>Upload a photo to see what AskSAV can tell you about your item.</small>
                  </div>
                </div>

                <div className="sf178-report-empty">
                  <div className="sf178-report-art">
                    <div className="sf178-art-back one"></div>
                    <div className="sf178-art-back two"></div>
                    <div className="sf178-art-main">🔎</div>
                    <div className="sf178-art-chip left">◇</div>
                    <div className="sf178-art-chip right">✹</div>
                    <div className="sf178-art-chip bottom">▥</div>
                  </div>

                  <h2>Upload a photo to see your results</h2>
                  <p>AskSAV will identify the item, verify the result, assess its visible condition and show indicative market value with similar items.</p>

                  <div className="sf178-report-cards">
                    <article className="blue"><span>🔎</span><strong>Identified item</strong><p>Brand, model and category</p></article>
                    <article className="green"><span>🛡</span><strong>Verification</strong><p>Cross-checks and confidence</p></article>
                    <article className="amber"><span>⚙</span><strong>Condition</strong><p>Visible wear and quality</p></article>
                    <article className="violet"><span>£</span><strong>Market value</strong><p>Estimated range and comparables</p></article>
                  </div>
                </div>
              </>
            ) : (
              <div className="sf178-results">
                <div className="sf178-report-title">
                  <span className="sf178-report-title-icon">▤</span>
                  <div><strong>Your visual intelligence report</strong><small>Verified insights from your uploaded item.</small></div>
                </div>

                <article className="sf178-result-card identify">
                  <div className="sf178-result-head">
                    <div>
                      <span className="sf178-result-label">IDENTIFIED ITEM</span>
                      <h2>{result.identification?.item_name || "Item identified"}</h2>
                      <p>{[result.identification?.brand, result.identification?.model, result.identification?.variant].filter(Boolean).join(" · ") || "Brand/model not confirmed"}</p>
                    </div>
                    <div className="sf178-result-score">{pct(result.identification?.confidence)}</div>
                  </div>

                  <div className={`sf178-verify ${result.verification?.verified ? "ok" : "warn"}`}>
                    <strong>{result.verification?.verified ? "✓ Identity verified" : "Identity needs review"}</strong>
                    <p>{result.verification?.reason}</p>
                  </div>
                </article>

                <article className="sf178-result-card condition">
                  <div className="sf178-result-head">
                    <div>
                      <span className="sf178-result-label green">CONDITION</span>
                      <h2>{result.condition?.grade || "UNKNOWN"}</h2>
                      <p>{result.condition?.summary}</p>
                    </div>
                    <div className="sf178-result-score green">{pct(result.condition?.confidence)}</div>
                  </div>
                </article>

                <div className="sf178-result-grid">
                  
                </div>
              </div>
            )}
          </section>

              {result && (
                <div className="asksav-result-with-market-v383">
                  <AskSAVMarketIntelligenceButton
                  analysis={result as Record<string, unknown>}
                />
              <div className="sf-commercial-layout">
                <div className="sf-commercial-left">
{!askSavLegacyMarketIsOnDemand(result) && (
  <article className="sf178-result-card value">
                      <span className="sf178-result-label violet">MARKET VALUE</span>
                      {result?.market?.available ? (
                        <>
                          <h2>{money(result?.market?.low, result?.market?.currency)} – {money(result?.market?.high, result?.market?.currency)}</h2>
                          <p>{result?.market?.evidence_summary}</p>
                        </>
                      ) : (
                        <>
                          <h2>More detail needed</h2>
                          <p>{result?.market?.reason || "AskSAV needs more verified evidence before showing a value."}</p>
                        </>
                      )}
                    
                      <MarketEvidencePanel evidence={(result as any)?.market_evidence} />
                    </article>
)}
                {result?._asksav?.entitlements?.sellingTools !== "NONE" ? (
                  <AskSAVActionLayer query={result?.market?.search_query || result.identification?.item_name || "similar item"} />
                ) : (
                  <section className="sf-action-layer">
                    
                  </section>
                )}
                </div>
<article className="sf178-result-card discover sf-commercial-discover">
                    <span className="sf178-result-label violet">DISCOVER</span>
                    <div className="sf178-market-links">
                      {links.map(link => (
                        <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
                          <MarketplaceIcon kind={link.kind} />
                          <div><strong>{link.label}</strong><small>Search marketplace ↗</small></div>
                        </a>
                      ))}
                    </div>
                  </article>
              </div>
            </div>
            )}
        </section>
      </main>
    </div>
  );
}
