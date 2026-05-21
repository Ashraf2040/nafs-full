"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function TeacherPerformanceChart({ data }: { data: any[] }) {
  if (data.length === 0) return <div className="h-[300px] flex items-center justify-center text-slate-400">No data available</div>;
  
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} dx={-10} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
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
    const v = typeof value === "number" ? value : Number(value ?? 0);

    return name === "score"
      ? [`${v}%`, "Avg Score"]
      : [v, "Students"];
  }}
/>
          <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={60}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.score >= 70 ? "#10b981" : entry.score >= 50 ? "#f59e0b" : "#ef4444"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}