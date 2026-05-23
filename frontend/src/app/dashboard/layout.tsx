import type { ReactNode } from "react";

import { AppShell } from "../../components/layout/app-shell";
import { DashboardWorkspaceProvider } from "../../components/mission-control/workspace-context";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardWorkspaceProvider>
      <AppShell>{children}</AppShell>
    </DashboardWorkspaceProvider>
  );
}
