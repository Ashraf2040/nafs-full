"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  TooltipProps,
} from "recharts";

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
  const [chartData, setChartData] = useState<GradeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    fetch("/api/stats")
      .then((r) => r.json())
      .then((json) => {
        if (json.data && json.data.length > 0) {
          setChartData(json.data);
        } else {
          setChartData(FALLBACK_DATA);
        }
      })
      .catch(() => setChartData(FALLBACK_DATA))
      .finally(() => setLoading(false));
  }, []);

  if (!mounted || loading) {
    return (
      <div className="w-full min-h-[300px] flex items-center justify-center">
        <div className="animate-pulse bg-slate-200 rounded-xl w-full h-[300px]" />
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

  // ✅ SAFE formatter (fixes TS error)
  const formatTooltip: TooltipProps<number, string>["formatter"] = (
    value,
    name
  ) => {
    const num = typeof value === "number" ? value : Number(value ?? 0);

    if (name === "score") return [`${num}%`, "Average Score"];
    if (name === "participation") return [num, "Active Students"];
    return [num, String(name)];
  };

  return (
    <div className="w-full" style={{ minHeight: "300px", height: "100%" }}>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />

          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }}
            dy={10}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#64748b", fontSize: 12 }}
            dx={-10}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />

          <Tooltip
  cursor={{ fill: "#f1f5f9" }}
  contentStyle={{
    borderRadius: "12px",
    border: "none",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    fontSize: "14px",
    fontWeight: 600,
  }}
  formatter={(value, name) => {
    const num = Number(value ?? 0);

    if (name === "score") return [`${num}%`, "Average Score"];
    if (name === "participation") return [num, "Active Students"];

    return [num, String(name)];
  }}
/>

          <Bar dataKey="score" name="score" radius={[6, 6, 0, 0]} maxBarSize={50}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}