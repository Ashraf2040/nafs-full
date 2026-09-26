// src/components/DashboardCharts.tsx — ENHANCED
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function DashboardCharts({ subjectPerformance, gradeDistribution, monthlyData, recentScores, isStudent }: any) {
  const [mounted, setMounted] = useState(false);
  const [animatedScores, setAnimatedScores] = useState<Record<string, number>>({});

  useEffect(() => {
    setMounted(true);
    // Animate bars on mount
    if (subjectPerformance) {
      const timers = subjectPerformance.map((s: any, i: number) => {
        return setTimeout(() => {
          setAnimatedScores(prev => ({ ...prev, [s.name]: s.avgScore }));
        }, i * 150);
      });
      return () => timers.forEach(clearTimeout);
    }
  }, [subjectPerformance]);

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-[300px] animate-pulse" />
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-[300px] animate-pulse" />
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return "bg-emerald-500";
    if (score >= 70) return "bg-indigo-500";
    if (score >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  const getScoreGradient = (score: number) => {
    if (score >= 85) return "from-emerald-500 to-teal-400";
    if (score >= 70) return "from-indigo-500 to-violet-400";
    if (score >= 60) return "from-amber-500 to-orange-400";
    return "from-red-500 to-rose-400";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Subject Performance Bars */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 min-h-[300px]">
        <h3 className="font-bold text-slate-800 mb-1">Performance by Subject</h3>
        <p className="text-xs text-slate-400 mb-4">Average scores across all assessments</p>
        <div className="space-y-4">
          {subjectPerformance?.map((s: any, i: number) => (
            <motion.div 
              key={s.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-semibold text-slate-700">{s.name}</span>
                <span className="font-bold text-slate-900">{animatedScores[s.name] || 0}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <motion.div 
                  className={`h-3 rounded-full bg-gradient-to-r ${getScoreGradient(s.avgScore)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(animatedScores[s.name] || 0, 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-400">{s.submissions || 0} submissions</span>
                <span className="text-[10px] text-slate-400">{s.quizzes || 0} quizzes</span>
              </div>
            </motion.div>
          ))}
          {(!subjectPerformance || subjectPerformance.length === 0) && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-sm text-slate-400 font-medium">No data available yet</p>
              <p className="text-xs text-slate-300 mt-1">Complete some assessments to see your progress</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Grade Distribution */}
      {!isStudent && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 min-h-[300px]">
          <h3 className="font-bold text-slate-800 mb-1">Students by Grade</h3>
          <p className="text-xs text-slate-400 mb-4">Distribution across grade levels</p>
          <div className="space-y-4">
            {gradeDistribution?.map((g: any, i: number) => (
              <motion.div 
                key={g.gradeLevel} 
                className="flex items-center gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <span className="text-sm font-semibold w-16 text-slate-600">Grade {g.gradeLevel}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                  <motion.div 
                    className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(g.count * 5, 100)}%` }}
                    transition={{ duration: 0.6, delay: i * 0.1 }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-700 w-8 text-right">{g.count}</span>
              </motion.div>
            ))}
            {(!gradeDistribution || gradeDistribution.length === 0) && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-2xl">👥</span>
                </div>
                <p className="text-sm text-slate-400 font-medium">No students enrolled yet</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Recent Scores for Students */}
      {isStudent && recentScores?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 min-h-[300px]">
          <h3 className="font-bold text-slate-800 mb-1">Recent Scores</h3>
          <p className="text-xs text-slate-400 mb-4">Your last 10 assessment results</p>
          <div className="space-y-2.5">
            {recentScores.map((r: any, i: number) => (
              <motion.div 
                key={i} 
                className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="min-w-0 flex-1 mr-3">
                  <span className="text-sm font-medium text-slate-700 truncate block">{r.quiz}</span>
                  <span className="text-[10px] text-slate-400">{r.subject}</span>
                </div>
                <span className={`font-bold text-sm px-2.5 py-1 rounded-lg ${
                  r.score >= 80 ? 'bg-emerald-50 text-emerald-600' : 
                  r.score >= 60 ? 'bg-amber-50 text-amber-600' : 
                  'bg-red-50 text-red-600'
                }`}>
                  {r.score.toFixed(0)}%
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}