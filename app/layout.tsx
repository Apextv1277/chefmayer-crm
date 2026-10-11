import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Chef Mayer",
  description: "Prospection des entreprises par offre de dégustation.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr-CA">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
