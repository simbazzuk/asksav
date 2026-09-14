"use client";

import { usePathname } from "next/navigation";
import SiteFaceAccountButton from "./SiteFaceAccountButton";

export default function SiteFaceNavigation() {
  const pathname = usePathname();

  return (
    <>
      <aside className="sf176-sidebar">
        <a href="/" className="sf176-brand">
          <span className="sf176-logo">SAV</span>
          <span>
            <strong>AskSAV</strong>
            <small>Visual Intelligence</small>
          </span>
        </a>

        <a href="/analyse" className="sf176-side-action">
          + Analyse an item
        </a>

        <nav>
          <a href="/" className={pathname === "/" ? "active" : ""}>
            <span className="sf20-nav-symbol" aria-hidden="true">⌂</span>
            <span>Home</span>
          </a>
          <a
            href="/analyse"
            className={pathname.startsWith("/analyse") ? "active" : ""}
          >
            <span className="sf20-nav-symbol" aria-hidden="true">◎</span>
            <span>Analyse</span>
          </a>
          <a
            href="/history"
            className={pathname.startsWith("/history") ? "active" : ""}
          >
            <span className="sf20-nav-symbol" aria-hidden="true">◷</span>
            <span>History</span>
          </a>
        </nav>

        <div className="sf176-side-note">
          <strong>See it. Know it. Value it.</strong>
          <p>Visual intelligence for the things you own and discover.</p>
        </div>

        <div className="sf176-version">
          v0.20.2
          <br />
          <span>● All systems ready</span>
        </div>
      </aside>

      <header className="sf176-topbar">
        <nav>
          <a href="/" className={pathname === "/" ? "active" : ""}>
            Home
          </a>
          <a
            href="/analyse"
            className={pathname.startsWith("/analyse") ? "active" : ""}
          >
            Analyse
          </a>
          <a
            href="/history"
            className={pathname.startsWith("/history") ? "active" : ""}
          >
            History
          </a>
        </nav>

        <div className="sf176-top-right">
          <SiteFaceAccountButton />
        </div>
      </header>
    </>
  );
}
