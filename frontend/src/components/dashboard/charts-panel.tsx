"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
  CartesianGrid
} from "recharts";

import type { StatsSummary, TimelinePoint } from "../../types/stats";

const colors = ["#ef4444", "#f59e0b", "#10b981", "#38bdf8", "#f97316", "#a855f7"];

export const ChartsPanel = ({
  summary,
  timeline
}: {
  summary: StatsSummary | null;
  timeline: TimelinePoint[];
}) => {
  const riskData = summary
    ? Object.entries(summary.riskDistribution).map(([name, value]) => ({ name, value }))
    : [];
  const labelData = summary
    ? Object.entries(summary.labelDistribution).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <section className="chart-grid">
      <article className="panel chart-panel">
        <h2>Risk Distribution</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={riskData}>
            <CartesianGrid stroke="#17304a" vertical={false} />
            <XAxis dataKey="name" stroke="#9ab6d3" />
            <YAxis stroke="#9ab6d3" />
            <Tooltip />
            <Bar dataKey="value" fill="#38bdf8" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </article>
      <article className="panel chart-panel">
        <h2>Label Distribution</h2>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={labelData} dataKey="value" nameKey="name" outerRadius={80}>
              {labelData.map((entry, index) => (
                <Cell key={entry.name} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </article>
      <article className="panel chart-panel chart-wide">
        <h2>Timeline</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={timeline}>
            <CartesianGrid stroke="#17304a" vertical={false} />
            <XAxis dataKey="bucket" stroke="#9ab6d3" />
            <YAxis stroke="#9ab6d3" />
            <Tooltip />
            <Line type="monotone" dataKey="total" stroke="#f97316" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </article>
    </section>
  );
};
