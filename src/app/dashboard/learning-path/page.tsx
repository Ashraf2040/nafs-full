"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import {
  BookOpen, CheckCircle2, Circle, Loader2, Target,
  Sparkles, AlertCircle, Brain, BarChart3, ArrowRight,
  Trophy, Zap
} from "lucide-react";
import Link from "next/link";

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  PENDING: {
    icon: Circle,
    color: "text-slate-300",
    bg: "bg-slate-50 border-slate-200",
    label: "Not Started",
  },
  PRACTICING: {
    icon: Zap,
    color: "text-amber-500",
    bg: "bg-amber-50 border-amber-200",
    label: "In Progress",
  },
  MASTERED: {
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-50 border-emerald-200",
    label: "Mastered",
  },
};

const domainColors: Record<string, string> = {
  "Numbers and operations": "from-blue-500 to-cyan-500",
  "Algebra and analysis": "from-violet-500 to-purple-500",
  "Geometry and measurement": "from-emerald-500 to-teal-500",
  "Statistics and probabilities": "from-orange-500 to-amber-500",
  "Reading Comprehension": "from-sky-500 to-indigo-500",
  "Vocabulary Acquisition and Use of Verbal Semantics": "from-pink-500 to-rose-500",
};

function getDomainColor(domain: string): string {
  return domainColors[domain] || "from-slate-500 to-slate-600";
}

export default function LearningPathPage() {
  const { data: session, status: sessionStatus } = useSession();
  const userRole = (session?.user as any)?.role;

  const [subject, setSubject] = useState("Math");
  const [grade, setGrade] = useState("6");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchLearningPath = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/learning-path?subject=${subject}&grade=${grade}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session) redirect("/login");
    if (userRole === "STUDENT") {
      fetchLearningPath();
    } else {
      setLoading(false);
    }
  }, [sessionStatus, subject, grade]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/learning-path/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, grade }),
      });
      if (res.ok) {
        await fetchLearningPath();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  if (sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={40} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  if (userRole !== "STUDENT") {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Learning Path</h1>
        <p className="text-slate-500">Learning paths are personalized for each student. Sign in as a student to view your path.</p>
      </div>
    );
  }

  // Group items by subDomain
  const grouped = items.reduce((acc: any, item: any) => {
    const domain = item.outcome?.subDomain || "General";
    if (!acc[domain]) acc[domain] = [];
    acc[domain].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const domainOrder = Object.keys(grouped);
  const totalItems = items.length;
  const masteredItems = items.filter((i) => i.status === "MASTERED" || i.mastery?.masteryLevel >= 70).length;
  const practicingItems = items.filter((i) => i.status === "PRACTICING").length;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/90 text-xs font-semibold mb-4 border border-white/10">
            <Brain size={14} /> Personalized Learning Path
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Your Learning Path</h1>
          <p className="text-indigo-200 mt-2 max-w-lg">
            Master skills step by step. Complete each outcome to unlock the next.
          </p>
        </div>
      </header>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-4 items-center">
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

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors shadow-md"
        >
          {generating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {generating ? "Generating..." : "Generate / Refresh Path"}
        </button>
      </div>

      {/* Progress Overview */}
      {totalItems > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Skills", value: totalItems, color: "text-indigo-600", bg: "bg-indigo-50", icon: Target },
            { label: "Mastered", value: masteredItems, color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 },
            { label: "In Progress", value: practicingItems, color: "text-amber-600", bg: "bg-amber-50", icon: Zap },
            { label: "Pending", value: totalItems - masteredItems - practicingItems, color: "text-slate-500", bg: "bg-slate-50", icon: Circle },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 text-center">
              <div className={`inline-flex p-2.5 ${stat.bg} rounded-xl ${stat.color} mb-2`}>
                <stat.icon size={20} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Learning Path Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={40} className="animate-spin text-indigo-600" />
        </div>
      ) : totalItems === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-16 text-center">
          <Brain size={64} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-600 mb-2">No Learning Path Yet</h2>
          <p className="text-slate-400 max-w-md mx-auto mb-6">
            Click <strong>&ldquo;Generate / Refresh Path&rdquo;</strong> to create your personalized learning path based on your assessment results.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-md"
          >
            <Sparkles size={20} /> Generate My Learning Path
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {domainOrder.map((domain) => {
            const domainItems = grouped[domain];
            const domainMastered = domainItems.filter((i: any) => i.status === "MASTERED" || i.mastery?.masteryLevel >= 70).length;
            const domainColor = getDomainColor(domain);

            return (
              <div key={domain} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className={`h-2 bg-gradient-to-r ${domainColor}`} />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">{domain}</h2>
                      <p className="text-sm text-slate-500">{domainMastered} of {domainItems.length} mastered</p>
                    </div>
                    <div className="w-24 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full bg-gradient-to-r ${domainColor}`}
                        style={{ width: `${(domainMastered / domainItems.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {domainItems.map((item: any, idx: number) => {
                      const mastery = item.mastery?.masteryLevel || 0;
                      const isMastered = mastery >= 70;
                      const effectiveStatus = isMastered ? "MASTERED" : item.status;
                      const config = statusConfig[effectiveStatus] || statusConfig.PENDING;
                      const StatusIcon = config.icon;

                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${config.bg}`}
                        >
                          <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${isMastered ? "bg-emerald-100 text-emerald-600" : "bg-white/80 text-slate-400 border border-slate-200"}`}>
                            <StatusIcon size={18} className={config.color} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-sm ${isMastered ? "text-slate-500 line-through" : "text-slate-800"}`}>
                              {item.outcome?.indicatorText || item.outcome?.outcomeText || "Skill"}
                            </p>
                            {item.outcome?.outcomeText && (
                              <p className="text-xs text-slate-400 mt-0.5 truncate">
                                {item.outcome.outcomeText}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3 flex-shrink-0">
                            {mastery > 0 && (
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                                mastery >= 90 ? "bg-emerald-100 text-emerald-700" :
                                mastery >= 70 ? "bg-green-100 text-green-700" :
                                mastery >= 50 ? "bg-amber-100 text-amber-700" :
                                "bg-red-100 text-red-700"
                              }`}>
                                {mastery}%
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-[60px] text-right">
                              {config.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
