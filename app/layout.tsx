import type { Metadata } from "next";
import "./globals.css";
import "./workspace.css";
import "./readability.css";

export const metadata: Metadata = {
  title: "AlexandreBOT · Apprendre et grandir ensemble",
  description:
    "Milo accompagne les élèves et Alexandre guide les parents. Groupe scolaire Alexandre, en français et en arabe.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
