"use client";

import {
  Bot,
  FlaskConical,
  Inbox,
  LayoutDashboard,
  ShieldCheck,
  ShieldAlert,
  Workflow
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/copilot", label: "Copilot", icon: Bot },
  { href: "/dashboard/incidents", label: "Incidents", icon: ShieldAlert },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/operations", label: "Operations", icon: Workflow },
  { href: "/dashboard/demo-lab", label: "Demo lab", icon: FlaskConical }
];

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="cyber-sidebar">
      <div className="cyber-brand">
        <div className="brand-mark">
          <ShieldCheck size={20} />
        </div>
        <div>
          <strong>SecureLens</strong>
          <span>MCIPS security</span>
        </div>
      </div>

      <nav className="cyber-nav" aria-label="SecureLens workspace">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link key={item.href} href={item.href} className={`cyber-nav-link ${active ? "cyber-nav-link-active" : ""}`}>
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-telemetry">
        <span className="status-dot status-dot-ok" />
        <div>
          <strong>Protected workspace</strong>
          <span>Monitoring is active</span>
        </div>
      </div>
    </aside>
  );
};
