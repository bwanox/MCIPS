"use client";

import type { ReactNode } from "react";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useDashboardWorkspace } from "../mission-control/workspace-context";

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { loading } = useDashboardWorkspace();

  if (loading) {
    return (
      <main className="cyber-loading">
        <span />
        Loading SecureLens
      </main>
    );
  }

  return (
    <main className="cyber-shell">
      <Sidebar />
      <section className="cyber-stage">
        <Topbar />
        <div className="cyber-content">{children}</div>
      </section>
    </main>
  );
};
