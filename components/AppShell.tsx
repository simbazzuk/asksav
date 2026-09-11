"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/properties", label: "Properties", icon: "⌂" },
  { href: "/findings", label: "Findings", icon: "!" },
  { href: "/inspection-session", label: "Inspection", icon: "✓" },
  { href: "/history", label: "History", icon: "◷" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (pathname.startsWith("/sessions/") && href === "/inspection-session") return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppShell({
  children,
  title = "AskSAV",
}: {
  children: ReactNode;
  title?: string;
}) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="logo">
          <img className="sf117-brand-icon" src="/siteface-icon-64.png" alt="AskSAV" />
          AskSAV
        </Link>

        <div className="nav-title">Workspace</div>

        <nav className="nav-list">
          {links.map((l) => (
            <Link
              key={l.href}
              className={`nav-link ${isActive(pathname, l.href) ? "active" : ""}`}
              href={l.href}
            >
              <span className="nav-icon">{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-foot">
          <div className="workspace">
            <strong>Smarter properties.</strong><br />
            Better inspection decisions.
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-title">{title}</div>

          <div className="topbar-actions">
            <div className="avatar">SP</div>
          </div>
        </header>

        <div className="content">{children}</div>
      </div>

      <nav className="mobile-nav">
        {links.map((l) => (
          <Link key={l.href} href={l.href}>
            <span>{l.icon}</span>
            {l.label === "Dashboard" ? "Home" : l.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
