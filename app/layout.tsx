import SiteFaceNavigation from "../components/SiteFaceNavigation";
import "./siteface-v0.10.3.2.css";
import "./globals.css";
import "./siteface-v0.7.1.css";
import "./siteface-v0.7.2.css";
import "./siteface-v0.8.css";
import "./siteface-v0.9.css";
import "./siteface-v0.9.4.css";
import "./siteface-v0.10.css";
import "./siteface-v0.10.1.css";
import "./siteface-v0.10.2.css";
import "./siteface-v0.10.3.css";
import "./siteface-v0.10.3.1.css";
import "./siteface-v0.11.css";
import "./siteface-v0.11.1.css";
import "./siteface-v0.11.3.css";
import "./siteface-v0.11.4.css";
import "./siteface-v0.11.5.css";
import "./siteface-v0.11.6.css";
import "./siteface-v0.11.7.css";
import "./siteface-v0.11.8.css";
import "./siteface-v0.11.9.css";
import "./siteface-v0.12-ui.css";
import "./siteface-v0.12.1-ui.css";
import "./siteface-v0.12.2-dashboard-contrast.css";
import "./siteface-v0.12.2.1-dashboard-contrast.css";
import "./siteface-v0.12.3.1-property-icon.css";
import "./siteface-v0.12.3.2-property-header.css";
import "./siteface-v0.12.4-inspection.css";
import "./siteface-v0.12.5.1-inspection-upload.css";
import "./siteface-v0.12.6.css";
import "./siteface-v0.12.6.1.css";
import "./siteface-v0.12.6.2.css";
import "./siteface-v0.12.6.3.css";
import "./siteface-v0.12.6.4.css";
import "./siteface-v0.12.6.5.css";
import "./siteface-v0.12.6.6.css";
import "./siteface-v0.12.6.7.css";
import "./siteface-v0.12.6.9.css";
import "./siteface-v0.12.7.css";
import "./siteface-v0.12.7.1.css";
import "./siteface-v0.12.7.2.css";
import "./siteface-v0.13.1.css";
import "./siteface-v0.13.4.css";
import "./siteface-v0.14.css";
import "./siteface-v0.14.3.css";
import "./siteface-v0.15.css";
import "./siteface-v0.16.css";
import "./siteface-v0.16.2.css";
import "./siteface-v0.16.3.css";
import "./siteface-v0.17.css";
import "./siteface-v0.17.1.css";
import "./siteface-v0.17.2.css";
import "./siteface-v0.17.3.css";
import "./siteface-v0.17.4.css";
import "./siteface-v0.17.5.css";
import "./siteface-v0.17.6.css";
import "./siteface-v0.17.7.css";
import "./siteface-v0.17.8.css";
import "./siteface-v0.17.9.css";
import "./siteface-v0.17.10.css";
import "./siteface-v0.17.11.css";
import "./siteface-v0.17.12.css";
import "./siteface-v0.17.12.1.css";
import "./siteface-v0.17.12.2.css";
import "./siteface-v0.17.12.3.css";
import "./siteface-v0.17.12.4.css";
import "./siteface-v0.17.12.5.css";
import "./siteface-v0.17.13.1.css";
import "./siteface-v0.17.13.2.css";
import "./siteface-v0.17.14.css";
import "./siteface-v0.17.14.1.css";
import "./siteface-v0.17.14.3.css";
import "./siteface-v0.17.14.4.css";
import "./siteface-v0.17.14.5.css";
import "./siteface-v0.17.14.6.css";
import "./siteface-v0.17.14.7.css";
import "./siteface-v0.17.14.8.css";
import "./siteface-v0.17.14.9.css";
import "./siteface-v0.18.css";
import "./siteface-v0.18.2.css";
import type { Metadata } from "next";

import "./siteface-v0.19.css";
import SiteFaceAccountButton from "../components/SiteFaceAccountButton";
import "./siteface-v0.19.1.css";
import "./siteface-v0.19.2.css";
import "./asksav-v0.19.3.css";
import "./asksav-v0.19.4.css";
import "./asksav-v0.19.4.2.css";
import "./asksav-v0.19.5.css";
import AskSavAnalysisProgress from "../components/AskSavAnalysisProgress";
export const metadata: Metadata = {
  icons: { icon: "/asksav-icon.png", apple: "/asksav-icon.png" },
  title: "AskSAV",
  description: "AI-powered property inspection intelligence",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteFaceNavigation />{children}        <SiteFaceAccountButton />
        <AskSavAnalysisProgress />
      </body>
    </html>
  );
}
