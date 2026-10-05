import type { Metadata } from "next";
import { DM_Sans, Lilita_One } from "next/font/google";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import "./globals.css";

const bodyFont = DM_Sans({ subsets: ["latin"], variable: "--font-body" });
const displayFont = Lilita_One({ subsets: ["latin"], weight: "400", variable: "--font-display" });
const appUrl = process.env.APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: "Crane Spotting", template: "%s | Crane Spotting" },
  description: "Look up. Spot cranes. Climb the Crane Spotting leaderboard.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>
        <div className="site-shell">
          <AppHeader />
          <main id="main-content" className="site-main">{children}</main>
          <footer className="site-footer">
            <span>Crane!</span>
            <span>CRANE SPOTTING</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
