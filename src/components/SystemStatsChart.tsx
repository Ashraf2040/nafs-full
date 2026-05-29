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
  TooltipProps,
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
      <div style={{ width: '100%', height: 350 }} className="flex items-center justify-center">
        <div className="animate-pulse bg-slate-200 rounded-xl" style={{ width: '100%', height: 350 }} />
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
    <div style={{ position: 'relative', width: '100%', height: 350 }}>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis domain={[0, 100]} />
          <Tooltip />

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