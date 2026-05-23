"use client";

import { Bot, CircleDot, Cpu, Database, LogOut, Server, ShieldCheck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { authService } from "../../services/auth-service";
import { useDashboardWorkspace } from "../mission-control/workspace-context";

const routeTitles: Record<string, { title: string; mode: string }> = {
  "/dashboard": { title: "Copilot Command Center", mode: "active response" },
  "/dashboard/copilot": { title: "AI Desk", mode: "conversation" },
  "/dashboard/incidents": { title: "Case Board", mode: "investigation" },
  "/dashboard/inbox": { title: "Threat Inbox", mode: "message triage" },
  "/dashboard/operations": { title: "Response Console", mode: "execution" },
  "/dashboard/demo-lab": { title: "Scenario Runner", mode: "demo" }
};

export const Topbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { email, systemHealth, aiFallbackActive } = useDashboardWorkspace();
  const route = pathname && pathname in routeTitles ? routeTitles[pathname as keyof typeof routeTitles] : routeTitles["/dashboard"];

  return (
    <header className="cyber-topbar">
      <div className="topbar-title">
        <span>{route.mode}</span>
        <h1>{route.title}</h1>
      </div>

      <div className="system-strip" aria-label="System status">
        <span className="system-pill system-pill-ok">
          <Server size={15} />
          {systemHealth?.backend ?? "backend"}
        </span>
        <span className={`system-pill ${systemHealth?.agent?.online ? "system-pill-ok" : "system-pill-warn"}`}>
          <Cpu size={15} />
          {systemHealth?.agent?.online ? "agent online" : "agent standby"}
        </span>
        <span className={`system-pill ${systemHealth?.databaseConnected ? "system-pill-ok" : "system-pill-danger"}`}>
          <Database size={15} />
          {systemHealth?.databaseConnected ? "data connected" : "data degraded"}
        </span>
        <span className={`system-pill ${aiFallbackActive ? "system-pill-warn" : "system-pill-info"}`}>
          <Bot size={15} />
          {aiFallbackActive ? "fallback AI" : "AI routed"}
        </span>
      </div>

      <div className="operator-bar">
        <span className="operator-id">
          <CircleDot size={12} />
          {email ?? "operator"}
        </span>
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
          <span>Logout</span>
        </button>
        <ShieldCheck size={18} className="topbar-shield" />
      </div>
    </header>
  );
};
