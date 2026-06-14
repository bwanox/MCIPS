import "./globals.css";
import "./clean-theme.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "MCIPS SecureLens",
  description: "AI-powered, privacy-preserving cyber defense assistant for phishing, login, and network threats"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
