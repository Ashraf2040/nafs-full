"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import {
  Loader2, Printer, Download, BookOpen,
  CheckCircle2, XCircle, AlertCircle, Target
} from "lucide-react";

const subjects = ["Math", "English", "Science"];
const grades = [3, 6, 9];

const subjectColors: Record<string, string> = {
  Math: "from-purple-500 to-fuchsia-600",
  English: "from-blue-500 to-indigo-600",
  Science: "from-emerald-500 to-teal-600",
};

const subjectAccent: Record<string, string> = {
  Math: "text-purple-600 bg-purple-50 border-purple-200",
  English: "text-blue-600 bg-blue-50 border-blue-200",
  Science: "text-emerald-600 bg-emerald-50 border-emerald-200",
};

function CircularProgress({ pct, size = 100, stroke = 8, color }: { pct: number; size?: number; stroke?: number; color: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000"
      />
    </svg>
  );
}

export default function ReportPage() {
  const { data: session, status: sessionStatus } = useSession();
  const userRole = (session?.user as any)?.role;
  const userName = (session?.user as any)?.name || "Student";

  const [grade, setGrade] = useState("6");
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session) redirect("/login");

    const fetchAll = async () => {
      setLoading(true);
      const results: Record<string, any> = {};
      for (const subj of subjects) {
        try {
          const res = await fetch(`/api/diagnostics?subject=${subj}&grade=${grade}`);
          if (res.ok) results[subj] = await res.json();
        } catch (e) { console.error(e); }
      }
      setData(results);
      setLoading(false);
    };
    fetchAll();
  }, [sessionStatus, grade]);

  const handlePrint = () => window.print();

  if (sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={40} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  const hasData = Object.values(data).some((d: any) => d?.totalOutcomes > 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Screen-only controls */}
      <div className="no-print">
        <header className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/90 text-xs font-semibold mb-4 border border-white/10">
              <Target size={14} /> Progress Report
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">My Progress Report</h1>
            <p className="text-slate-300 mt-2">Comprehensive overview across all subjects</p>
          </div>
        </header>

        <div className="flex gap-4 flex-wrap items-center mt-5">
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {grades.map((g) => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md transition-colors"
          >
            <Printer size={18} /> Print / Save PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={40} className="animate-spin text-indigo-600" />
        </div>
      ) : !hasData ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-16 text-center">
          <Target size={64} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-600 mb-2">No Data Yet</h2>
          <p className="text-slate-400">Complete assessments to generate your report.</p>
        </div>
      ) : (
        <>
          {/* Student Info */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 text-center print:border-2">
            <h2 className="text-2xl font-bold text-slate-900">{userName}</h2>
            <p className="text-slate-500">Grade {grade} • NAFS Preparation Report</p>
            <p className="text-xs text-slate-400 mt-1">Generated {new Date().toLocaleDateString()}</p>
          </div>

          {/* Subject Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {subjects.map((subj) => {
              const d = data[subj] as any;
              if (!d) return null;
              const pct = d.overallMastery || 0;
              const mastered = d.masteredOutcomes || 0;
              const total = d.totalOutcomes || 0;
              const color = subj === "Math" ? "#7c3aed" : subj === "English" ? "#4f46e5" : "#059669";

              return (
                <div key={subj} className={`bg-white rounded-3xl border-2 ${subjectAccent[subj]} shadow-sm p-6 text-center ${pct >= 70 ? "print:border-green-400" : ""}`}>
                  <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-r ${subjectColors[subj]} text-white mb-4`}>
                    <BookOpen size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{subj}</h3>
                  <div className="flex justify-center my-4">
                    <CircularProgress pct={pct} size={110} stroke={10} color={color} />
                  </div>
                  <div className="absolute ml-12 -mt-24">
                    <p className="text-2xl font-extrabold text-slate-900">{pct}%</p>
                  </div>
                  <p className="text-sm text-slate-500 mt-2">{mastered} of {total} indicators mastered</p>

                  <div className="mt-4 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full bg-gradient-to-r ${subjectColors[subj]}`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed breakdown */}
          {subjects.map((subj) => {
            const d = data[subj] as any;
            if (!d?.domains) return null;
            const domains = Object.entries(d.domains) as [string, any][];

            return (
              <div key={subj} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden print:break-inside-avoid">
                <div className={`h-1.5 bg-gradient-to-r ${subjectColors[subj]}`} />
                <div className="p-6">
                  <h2 className="text-xl font-bold text-slate-900 mb-1">{subj} — Domain Breakdown</h2>
                  <p className="text-sm text-slate-500 mb-6">Indicators mastered vs not yet completed</p>

                  {domains.map(([domain, info]) => {
                    const pct = info.maxPoints > 0 ? Math.round((info.points / info.maxPoints) * 100) : 0;
                    const mastered = info.outcomes?.filter((o: any) => o.masterLevel >= 70) || [];
                    const notMastered = info.outcomes?.filter((o: any) => o.masterLevel < 70) || [];

                    return (
                      <div key={domain} className="mb-6 last:mb-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-slate-800">{domain}</h3>
                          <span className="text-sm font-bold text-slate-600">{info.points}/{info.maxPoints} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
                          <div className={`h-2 rounded-full bg-gradient-to-r ${subjectColors[subj]}`} style={{ width: `${pct}%` }} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Mastered */}
                          <div>
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                              <CheckCircle2 size={12} /> Mastered ({mastered.length})
                            </p>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {mastered.slice(0, 10).map((o: any) => (
                                <p key={o.outcomeId} className="text-xs text-slate-600 flex items-start gap-1.5">
                                  <CheckCircle2 size={10} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                  <span>{(o.indicatorText || o.outcomeText || "").slice(0, 80)}</span>
                                </p>
                              ))}
                              {mastered.length > 10 && (
                                <p className="text-xs text-slate-400 italic">+{mastered.length - 10} more</p>
                              )}
                              {mastered.length === 0 && (
                                <p className="text-xs text-slate-400 italic">None mastered yet</p>
                              )}
                            </div>
                          </div>

                          {/* Not mastered */}
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                              <XCircle size={12} /> Not Yet Completed ({notMastered.length})
                            </p>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {notMastered.slice(0, 10).map((o: any) => (
                                <p key={o.outcomeId} className="text-xs text-slate-500 flex items-start gap-1.5">
                                  <AlertCircle size={10} className="text-slate-300 mt-0.5 flex-shrink-0" />
                                  <span>{(o.indicatorText || o.outcomeText || "").slice(0, 80)}</span>
                                </p>
                              ))}
                              {notMastered.length > 10 && (
                                <p className="text-xs text-slate-400 italic">+{notMastered.length - 10} more</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Print-only footer */}
          <div className="hidden print:block text-center text-xs text-slate-400 mt-8">
            <p>NAFS Prep — National Assessment of Future Skills Preparation</p>
            <p>Generated {new Date().toLocaleDateString()}</p>
          </div>
        </>
      )}
    </div>
  );
}
