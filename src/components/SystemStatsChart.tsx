"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { fetcher } from "@/lib/fetcher";

interface GradeData {
  name: string;
  score: number;
  participation: number;
}

const FALLBACK_DATA: GradeData[] = [
  { name: "Grade 3", score: 0, participation: 0 },
  { name: "Grade 4", score: 0, participation: 0 },
  { name: "Grade 5", score: 0, participation: 0 },
  { name: "Grade 6", score: 0, participation: 0 },
  { name: "Grade 7", score: 0, participation: 0 },
  { name: "Grade 8", score: 0, participation: 0 },
  { name: "Grade 9", score: 0, participation: 0 },
];

export function SystemStatsChart() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { data: json, isLoading } = useSWR('/api/stats', fetcher);

  const chartData: GradeData[] = json?.data?.length ? json.data : FALLBACK_DATA;
  const loading = isLoading;

  if (!mounted || loading) {
    return (
      <div style={{ width: '100%', height: 'clamp(270px, 38vw, 350px)' }} className="flex min-w-0 items-center justify-center">
        <div className="animate-pulse rounded-xl bg-slate-200" style={{ width: '100%', height: '100%' }} />
      </div>
    );
  }

  const getBarColor = (score: number) => {
    if (score === 0) return "#e2e8f0";
    if (score >= 85) return "#10b981";
    if (score >= 70) return "#6366f1";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="min-w-0" style={{ position: 'relative', width: '100%', height: 'clamp(270px, 38vw, 350px)' }}>
      <ResponsiveContainer width="100%" height="100%" debounce={80}>
        <BarChart data={chartData} margin={{ top: 12, right: 8, left: -12, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} tickMargin={9} interval="preserveStartEnd" />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value) => `${value}%`} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} width={42} />
          <Tooltip formatter={(value) => [`${Number(value ?? 0).toFixed(0)}%`, "Average score"]} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 12px 28px rgba(15,23,42,.12)" }} />

          <Bar dataKey="score" radius={[6, 6, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
