"use client";

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { useEffect, useState } from "react";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function ChartContainer({ children, height = 350 }: { children: React.ReactNode; height?: number }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ width: '100%', height: `clamp(240px, 34vw, ${height}px)` }} className="min-w-0 animate-pulse rounded-xl bg-slate-100" />;
  }

  return (
    <div className="min-w-0" style={{ position: 'relative', width: '100%', height: `clamp(240px, 34vw, ${height}px)` }}>
      <ResponsiveContainer width="100%" height="100%" debounce={80}>
        {children as any}
      </ResponsiveContainer>
    </div>
  );
}

export function ScoreTrendsChart({ data }: { data: any[] }) {
  return (
    <ChartContainer height={350}>
      <AreaChart data={data} margin={{ top: 12, right: 8, left: -14, bottom: 4 }}>
        <defs>
          <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} tickMargin={8} minTickGap={8} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} width={42} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} />
        <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 12px 28px rgba(15,23,42,.12)" }} />
        <Area type="monotone" dataKey="avg" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAvg)" />
      </AreaChart>
    </ChartContainer>
  );
}

export function GradePieChart({ data }: { data: any[] }) {
  return (
    <ChartContainer height={350}>
      <PieChart>
        <Pie data={data} cx="50%" cy="44%" innerRadius="34%" outerRadius="62%" paddingAngle={3} dataKey="value">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
      </PieChart>
    </ChartContainer>
  );
}

export function ProficiencyChart({ data }: { data: any[] }) {
  const bandColors = ["#ef4444", "#f59e0b", "#10b981", "#6366f1"];
  return (
    <ChartContainer height={300}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} tickMargin={8} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
        <Tooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32}>
          {data.map((entry, index) => (
            <Cell key={index} fill={bandColors[index % bandColors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function GrowthWindowChart({ data }: { data: any[] }) {
  return (
    <ChartContainer height={300}>
      <AreaChart data={data} margin={{ top: 12, right: 8, left: -14, bottom: 4 }}>
        <defs>
          <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} tickMargin={8} minTickGap={8} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} width={42} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} />
        <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
        <Area type="monotone" dataKey="avg" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorGrowth)" />
      </AreaChart>
    </ChartContainer>
  );
}

export function SubjectBarChart({ data }: { data: any[] }) {
  return (
    <ChartContainer height={Math.max(280, Math.min(460, data.length * 40 + 70))}>
      <BarChart data={data} layout="vertical" margin={{ top: 6, right: 12, left: 0, bottom: 6 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
        <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
        <YAxis dataKey="name" type="category" width={104} tick={{ fill: "#475569", fontSize: 10, fontWeight: 600 }} />
        <Tooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
        <Bar dataKey="avg" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={20}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.avg >= 70 ? "#10b981" : entry.avg >= 50 ? "#f59e0b" : "#ef4444"} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
