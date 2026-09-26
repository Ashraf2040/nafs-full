"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import {
  BarChart3, Brain, Trophy, TrendingUp, Target,
  Loader2, AlertCircle, Users, BookOpen, CheckCircle2,
  TrendingDown, Clock, ArrowUpRight, Printer
} from "lucide-react";
import Link from "next/link";

const statusColors: Record<string, string> = {
  EXCEEDS: "text-emerald-600 bg-emerald-50 border-emerald-200",
  MEETS: "text-green-600 bg-green-50 border-green-200",
  APPROACHING: "text-amber-600 bg-amber-50 border-amber-200",
  BELOW: "text-red-600 bg-red-50 border-red-200",
};

const statusLabels: Record<string, string> = {
  EXCEEDS: "Exceeds",
  MEETS: "Meets",
  APPROACHING: "Approaching",
  BELOW: "Below",
};

const domainColors: Record<string, string> = {
  "Numbers and operations": "from-blue-500 to-cyan-500",
  "Algebra and analysis": "from-violet-500 to-purple-500",
  "Geometry and measurement": "from-emerald-500 to-teal-500",
  "Statistics and probabilities": "from-orange-500 to-amber-500",
  "Reading Comprehension": "from-sky-500 to-indigo-500",
  "Vocabulary Acquisition and Use of Verbal Semantics": "from-pink-500 to-rose-500",
};

const tierColors: Record<string, string> = {
  PLATINUM: "text-slate-100 bg-gradient-to-r from-slate-400 to-slate-300 border-slate-300",
  GOLD: "text-amber-800 bg-amber-100 border-amber-300",
  SILVER: "text-slate-700 bg-slate-100 border-slate-300",
  BRONZE: "text-orange-800 bg-orange-100 border-orange-300",
};

export default function DiagnosticsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const userRole = (session?.user as any)?.role;
  const userName = (session?.user as any)?.name || "Student";

  const [subject, setSubject] = useState("Math");
  const [grade, setGrade] = useState("6");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session) redirect("/login");

    const fetchDiagnostics = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/diagnostics?subject=${subject}&grade=${grade}`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDiagnostics();
  }, [sessionStatus, subject, grade]);

  if (sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={40} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/90 text-xs font-semibold mb-4 border border-white/10">
            <BarChart3 size={14} /> Diagnostic Report
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">{userName}&rsquo;s Diagnostics</h1>
          <p className="text-indigo-200 mt-2">Skill mastery, domain performance, and growth tracking</p>
        </div>
      </header>

      {/* Subject/Grade Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex gap-4">
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="Math">Math</option>
          <option value="Science">Science</option>
          <option value="English">English</option>
        </select>
        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-400"
        >
          {[3, 6, 9].map((g) => (
            <option key={g} value={g}>Grade {g}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={40} className="animate-spin text-indigo-600" />
        </div>
      ) : !data ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-16 text-center">
          <Brain size={64} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-600 mb-2">No Diagnostic Data</h2>
          <p className="text-slate-400">Complete some assessments to see your diagnostic report.</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Target size={22} /></div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Mastery</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900">{data.overallMastery}%</p>
              <p className="text-xs text-slate-500 mt-1">{data.masteredOutcomes} of {data.totalOutcomes} outcomes mastered</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp size={22} /></div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Latest Score</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900">{data.latestScore ?? "—"}</p>
              <p className="text-xs text-slate-500 mt-1">Most recent assessment</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><Users size={22} /></div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Percentile</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900">{data.percentile !== null ? `${data.percentile}th` : "—"}</p>
              <p className="text-xs text-slate-500 mt-1">National rank</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl"><Trophy size={22} /></div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trophies</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900">{data.trophies?.length || 0}</p>
              <p className="text-xs text-slate-500 mt-1">Achievements earned</p>
            </div>
          </div>

          {/* Domain Performance */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-1">Domain Performance</h2>
              <p className="text-sm text-slate-500 mb-6">Breakdown by skill domain</p>

              {Object.entries(data.domains || {}).length === 0 ? (
                <p className="text-slate-400 text-center py-8">No domain data available.</p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(data.domains || {}).map(([domain, info]: [string, any]) => {
                    const pct = info.maxPoints > 0 ? Math.round((info.points / info.maxPoints) * 100) : 0;
                    const color = domainColors[domain] || "from-indigo-500 to-purple-500";

                    return (
                      <div key={domain}>
                        <div className="flex justify-between items-baseline mb-2">
                          <h3 className="font-semibold text-slate-800">{domain}</h3>
                          <span className="text-sm font-bold text-slate-900">{info.points}/{info.maxPoints} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-3 rounded-full bg-gradient-to-r ${color}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5">{info.mastered} of {info.total} outcomes mastered</p>

                        {/* Outcome-level detail */}
                        <div className="mt-3 space-y-1.5">
                          {info.outcomes?.slice(0, 5).map((o: any) => (
                            <div key={o.outcomeId} className="flex items-center gap-2 text-xs">
                              <span className={`w-2 h-2 rounded-full ${
                                o.masterLevel >= 70 ? "bg-emerald-500" : o.masterLevel >= 50 ? "bg-amber-500" : "bg-red-500"
                              }`} />
                              <span className="text-slate-600 truncate flex-1">{o.indicatorText || o.outcomeText}</span>
                              <span className={`font-bold px-1.5 py-0.5 rounded ${
                                o.masterLevel >= 70 ? "text-emerald-700 bg-emerald-50" : 
                                o.masterLevel >= 50 ? "text-amber-700 bg-amber-50" : 
                                "text-red-700 bg-red-50"
                              }`}>
                                {o.masterLevel}%
                              </span>
                            </div>
                          ))}
                          {info.outcomes?.length > 5 && (
                            <p className="text-xs text-slate-400 italic">+{info.outcomes.length - 5} more outcomes</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Growth Trend */}
          {data.windowScores?.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2">
                <TrendingUp size={22} className="text-indigo-500" /> Growth Over Time
              </h2>
              <p className="text-sm text-slate-500 mb-6">Score progression across testing windows</p>

              <div className="space-y-4">
                {data.windowScores.map((w: any, i: number) => {
                  const prevScore = i > 0 ? data.windowScores[i - 1].avgScore : null;
                  const growth = prevScore !== null ? w.avgScore - prevScore : null;

                  return (
                    <div key={w.windowName} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 text-sm">{w.windowName}</p>
                        <p className="text-xs text-slate-400">{new Date(w.startDate).toLocaleDateString()} — {new Date(w.endDate).toLocaleDateString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-extrabold text-slate-900">{w.avgScore}%</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Avg Score</p>
                      </div>
                      <div className="text-center min-w-[60px]">
                        {growth !== null && (
                          <div className={`flex items-center gap-1 text-sm font-bold ${growth >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {growth >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            {growth >= 0 ? "+" : ""}{growth}
                          </div>
                        )}
                        {growth === null && <span className="text-xs text-slate-400">Baseline</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trophies */}
          {data.trophies?.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Trophy size={22} className="text-amber-500" /> Trophies & Achievements
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {data.trophies.map((t: any) => (
                  <div
                    key={t.id}
                    className={`p-4 rounded-2xl border-2 text-center ${tierColors[t.tier] || "bg-slate-50 border-slate-200"}`}
                  >
                    <Trophy size={32} className="mx-auto mb-2" />
                    <p className="text-sm font-bold">{t.tier}</p>
                    <p className="text-[10px] opacity-75">{t.domain}</p>
                    <p className="text-xs font-semibold mt-1">{t.outcomesMastered} mastered</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Links to other tools */}
          <div className="flex gap-4 flex-wrap">
            <Link
              href="/dashboard/learning-path"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-md"
            >
              <Brain size={18} /> View Learning Path <ArrowUpRight size={16} />
            </Link>
            <Link
              href="/dashboard/report"
              className="inline-flex items-center gap-2 bg-amber-50 border-2 border-amber-200 text-amber-700 px-6 py-3 rounded-xl font-semibold hover:bg-amber-100 transition-colors"
            >
              <Printer size={18} /> Print Full Report <ArrowUpRight size={16} />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
