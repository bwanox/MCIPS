"use client";

import {
  Activity,
  Bot,
  FlaskConical,
  Inbox,
  LayoutDashboard,
  RadioTower,
  ShieldAlert,
  Workflow
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Command", meta: "Copilot center", icon: LayoutDashboard },
  { href: "/dashboard/copilot", label: "AI Desk", meta: "Conversation", icon: Bot },
  { href: "/dashboard/incidents", label: "Cases", meta: "Investigation", icon: ShieldAlert },
  { href: "/dashboard/inbox", label: "Inbox", meta: "Messages", icon: Inbox },
  { href: "/dashboard/operations", label: "Ops", meta: "Actions", icon: Workflow },
  { href: "/dashboard/demo-lab", label: "Demo", meta: "Scenario", icon: FlaskConical }
];

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="cyber-sidebar">
      <div className="cyber-brand">
        <div className="brand-mark">
          <RadioTower size={20} />
        </div>
        <div>
          <span>MCIPS</span>
          <strong>SecureLens</strong>
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
              <small>{item.meta}</small>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-telemetry">
        <Activity size={16} />
        <div>
          <span>Runtime</span>
          <strong>Live workspace</strong>
        </div>
      </div>
    </aside>
  );
};
