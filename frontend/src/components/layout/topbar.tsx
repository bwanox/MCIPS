"use client";

import { CircleDot, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { authService } from "../../services/auth-service";
import { useDashboardWorkspace } from "../mission-control/workspace-context";

const routeTitles: Record<string, { title: string; description: string }> = {
  "/dashboard": { title: "Security overview", description: "Your current risk posture and priority work." },
  "/dashboard/copilot": { title: "Security copilot", description: "Investigate incidents with contextual AI guidance." },
  "/dashboard/incidents": { title: "Incidents", description: "Review evidence, timelines, and recommended actions." },
  "/dashboard/inbox": { title: "Threat inbox", description: "Triage suspicious messages and incoming signals." },
  "/dashboard/operations": { title: "Operations", description: "Approve and track response actions." },
  "/dashboard/demo-lab": { title: "Demo lab", description: "Run scenarios and submit controlled test events." }
};

export const Topbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { email, systemHealth } = useDashboardWorkspace();
  const route = pathname && pathname in routeTitles ? routeTitles[pathname as keyof typeof routeTitles] : routeTitles["/dashboard"];
  const servicesOnline = Boolean(
    systemHealth?.backend === "ok" &&
      systemHealth?.databaseConnected &&
      systemHealth?.agent?.online
  );

  return (
    <header className="cyber-topbar">
      <div className="topbar-title">
        <h1>{route.title}</h1>
        <p>{route.description}</p>
      </div>

      <div className="system-strip" aria-label="System status">
        <span className={`system-pill ${servicesOnline ? "system-pill-ok" : "system-pill-warn"}`}>
          <CircleDot size={12} />
          {servicesOnline ? "All systems operational" : "Service attention needed"}
        </span>
      </div>

      <div className="operator-bar">
        <span className="operator-id">
          {(email ?? "operator").slice(0, 1).toUpperCase()}
        </span>
        <span className="operator-email">{email ?? "operator"}</span>
        <button
          className="icon-action"
          type="button"
          title="Logout"
          onClick={async () => {
            await authService.logout();
            window.localStorage.removeItem("mcips_token");
            router.replace("/login");
          }}
        >
          <LogOut size={17} />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  );
};
