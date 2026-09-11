"use client";

import { useEffect } from "react";

export default function VisualIntelligenceHome() {
  useEffect(() => {
    document.documentElement.classList.add("sf179-active");
    document.body.classList.add("sf179-active");
    return () => {
      document.documentElement.classList.remove("sf179-active");
      document.body.classList.remove("sf179-active");
    };
  }, []);

  return (
    <div className="sf179-shell">
      <aside className="sf179-sidebar">
        <a href="/" className="sf179-brand">
          <span className="sf179-logo">SAV</span>
          <span>
            <strong>AskSAV</strong>
            <small>Visual Intelligence</small>
          </span>
        </a>

        <a href="/analyse" className="sf179-side-cta">＋ Analyse an item</a>

        <nav className="sf179-side-nav">
          <a href="/" className="active"><span>⌂</span>Home</a>
          <a href="/analyse"><span>◉</span>Analyse</a>
          <a href="/history"><span>◷</span>History</a>
        </nav>

        <div className="sf179-side-card">
          <span className="sf179-bulb">◉</span>
          <div>
            <strong>See it. Know it.<br />Value it.</strong>
            <p>Visual intelligence for the things you own and discover.</p>
          </div>
        </div>

        <div className="sf179-version">v0.17.9</div>
        <div className="sf179-status">● All systems ready</div>
      </aside>

      <header className="sf179-header">
        <nav>
          <a href="/" className="active">Home</a>
          <a href="/analyse">Analyse</a>
          <a href="/history">History</a>
        </nav>

        <div className="sf179-header-actions">
          <div className="sf179-mantra">◉ <span>See it. Know it. Value it.</span></div>
          <div className="sf179-avatar">SP</div>
        </div>
      </header>

      <main className="sf179-main">
        <section className="sf179-hero">
          <div className="sf179-copy">
            <span className="sf179-kicker">VISUAL INTELLIGENCE FOR EVERYDAY ITEMS</span>
            <h1>Know what you've got.<br /><span>Know what it's worth.</span></h1>
            <p>
              Take a photo of almost anything. AskSAV identifies it, verifies what it sees,
              assesses visible condition and helps you understand its market value.
            </p>

            <div className="sf179-actions">
              <a href="/analyse" className="sf179-primary">Analyse an item</a>
              <a href="#how" className="sf179-secondary">See how it works</a>
            </div>

            <div className="sf179-proof">
              <span>✓ Verified identity</span>
              <span>✓ Visible condition</span>
              <span>✓ Market insight</span>
            </div>
          </div>

          <div className="sf179-visual">
            <div className="sf179-visual-bg"></div>

            <div className="sf179-phone">
              <div className="sf179-phone-top"></div>
              <div className="sf179-phone-screen">
                <div className="sf179-product-stage">
                  <div className="sf179-product-card">⌨</div>
                </div>

                <div className="sf179-product-copy">
                  <small>IDENTIFIED ITEM</small>
                  <strong>Portable computer keyboard</strong>
                  <span>✓ Verified · Good condition</span>
                </div>

                <div className="sf179-value-card">
                  <small>ESTIMATED VALUE</small>
                  <strong>£18 – £28</strong>
                  <span>Based on current UK market evidence</span>
                </div>
              </div>
            </div>

            <div className="sf179-float verify">
              <small>VERIFY</small>
              <strong>Identity confirmed</strong>
              <span>95% confidence</span>
            </div>

            <div className="sf179-float market">
              <small>VALUE</small>
              <strong>14 comparables</strong>
              <span>Live marketplace evidence</span>
            </div>
          </div>
        </section>

        <section id="how" className="sf179-how">
          <div className="sf179-section-heading">
            <span className="sf179-kicker">HOW ASKSAV WORKS</span>
            <h2>One photo. Five layers of intelligence.</h2>
            <p>AskSAV does more than recognise an item. It checks what it sees before using that identity for condition and value.</p>
          </div>

          <div className="sf179-steps">
            {[
              ["🔎","Identify","Recognise the item from visible evidence.","blue"],
              ["🛡","Verify","Cross-check the result before trusting it.","green"],
              ["⚙","Condition","Assess visible wear and damage.","amber"],
              ["£","Value","Estimate a responsible market range.","violet"],
              ["◫","Discover","Explore similar items and next actions.","purple"],
            ].map(([icon,title,copy,tone]) => (
              <article key={title} className={`sf179-step ${tone}`}>
                <span>{icon}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="sf179-example">
          <div className="sf179-example-image">
            <div className="sf179-example-item">⌨</div>
            <span>YOUR ITEM</span>
          </div>

          <div className="sf179-example-content">
            <span className="sf179-kicker">EXAMPLE RESULT</span>
            <div className="sf179-example-head">
              <div>
                <h2>A4Tech portable keyboard</h2>
                <p>✓ Verified identity · Good visible condition</p>
              </div>
              <div className="sf179-score">92%</div>
            </div>

            <div className="sf179-value-grid">
              <div className="main">
                <small>ESTIMATED USED VALUE</small>
                <strong>£18 – £28</strong>
              </div>
              <div>
                <small>SUGGESTED LISTING</small>
                <strong>£24</strong>
              </div>
              <div>
                <small>QUICK SALE</small>
                <strong>£16</strong>
              </div>
            </div>

            <div className="sf179-reasons">
              <span>✓ Identity independently verified</span>
              <span>✓ Condition assessed from the photo</span>
              <span>✓ Comparable market evidence found</span>
            </div>
          </div>
        </section>

        <section className="sf179-use">
          <div className="sf179-section-heading">
            <span className="sf179-kicker">USE IT FOR ALMOST ANYTHING</span>
            <h2>From everyday objects to higher-value items.</h2>
          </div>

          <div className="sf179-use-grid">
            {[
              ["⌚","Electronics","Phones, laptops, cameras and accessories."],
              ["🪑","Home","Furniture, appliances and household items."],
              ["🚲","Vehicles","Cars, bikes and visible condition evidence."],
              ["👜","Collectibles","Watches, trainers, specialist items and more."],
            ].map(([icon,title,copy]) => (
              <article key={title}>
                <span>{icon}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="sf179-final-cta">
          <div>
            <span className="sf179-kicker">TRY ASKSAV</span>
            <h2>See what your item can tell you.</h2>
            <p>Upload a photo and let AskSAV identify, verify, assess and value it.</p>
          </div>
          <a href="/analyse" className="sf179-primary">Analyse an item</a>
        </section>
      </main>
    </div>
  );
}
