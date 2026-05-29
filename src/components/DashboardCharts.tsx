// src/components/DashboardCharts.tsx
"use client";

import { useEffect, useState } from "react";

export default function DashboardCharts({ subjectPerformance, gradeDistribution, monthlyData, recentScores, isStudent }: any) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch + ensure container has size before render
  if (!mounted) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-[300px] animate-pulse" />
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-[300px] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Subject Performance Bars */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 min-h-[300px]">
        <h3 className="font-bold text-slate-800 mb-4">Performance by Subject</h3>
        <div className="space-y-3">
          {subjectPerformance?.map((s: any) => (
            <div key={s.name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-semibold">{s.name}</span>
                <span className="font-bold">{s.avgScore}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div 
                  className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(s.avgScore, 100)}%` }} 
                />
              </div>
            </div>
          ))}
          {(!subjectPerformance || subjectPerformance.length === 0) && (
            <p className="text-sm text-slate-400 text-center py-8">No data available</p>
          )}
        </div>
      </div>
      
      {/* Grade Distribution */}
      {!isStudent && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 min-h-[300px]">
          <h3 className="font-bold text-slate-800 mb-4">Students by Grade</h3>
          <div className="space-y-3">
            {gradeDistribution?.map((g: any) => (
              <div key={g.gradeLevel} className="flex items-center gap-3">
                <span className="text-sm font-semibold w-16">Grade {g.gradeLevel}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                  <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${Math.min(g.count * 5, 100)}%` }} />
                </div>
                <span className="text-sm font-bold">{g.count}</span>
              </div>
            ))}
            {(!gradeDistribution || gradeDistribution.length === 0) && (
              <p className="text-sm text-slate-400 text-center py-8">No data available</p>
            )}
          </div>
        </div>
      )}
      
      {/* Recent Scores for Students */}
      {isStudent && recentScores?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 min-h-[300px]">
          <h3 className="font-bold text-slate-800 mb-4">Recent Scores</h3>
          <div className="space-y-2">
            {recentScores.map((r: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium truncate max-w-[200px]">{r.quiz}</span>
                <span className={`font-bold ${r.score >= 80 ? 'text-emerald-600' : r.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                  {r.score.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}