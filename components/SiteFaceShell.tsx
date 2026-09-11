import Link from "next/link";
import { ReactNode } from "react";

export default function AskSAVShell({ children }: { children: ReactNode }) {
  return (
    <main className="shell">
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brand-mark">SAV</span>
          AskSAV
        </Link>

        <nav className="nav">
          <Link href="/">Dashboard</Link>
          <Link href="/properties">Properties</Link>
          <Link href="/inspect">Quick inspect</Link>
          <Link href="/inspection-session">Inspection session</Link>
          <Link href="/history">History</Link>
        </nav>
      </header>

      {children}
    </main>
  );
}
