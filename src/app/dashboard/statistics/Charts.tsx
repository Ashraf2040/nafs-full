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
    return <div style={{ width: '100%', height }} className="animate-pulse bg-slate-100 rounded-xl" />;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <ResponsiveContainer width="100%" height={height}>
        {children as any}
      </ResponsiveContainer>
    </div>
  );
}

export function ScoreTrendsChart({ data }: { data: any[] }) {
  return (
    <ChartContainer height={350}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} dy={10} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
        <Area type="monotone" dataKey="avg" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAvg)" />
      </AreaChart>
    </ChartContainer>
  );
}

export function GradePieChart({ data }: { data: any[] }) {
  return (
    <ChartContainer height={350}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ChartContainer>
  );
}

export function SubjectBarChart({ data }: { data: any[] }) {
  return (
    <ChartContainer height={300}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fontWeight: 600 }} />
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