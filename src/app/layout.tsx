import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";

export const metadata: Metadata = {
  title: "NEXUS — Unified Personal Command Center",
  description: "Eliminate context switching. Academic deadlines, tasks, projects, calendar, notes, and focus in one unified operating system.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-nexus-950 text-foreground selection:bg-indigo-500/30 selection:text-indigo-200 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
