"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import {
  Gamepad2, Loader2, AlertCircle, Plus, Target,
  Trophy, Clock, Users, CheckCircle2,
  Trash2, Sparkles, Zap, Medal, PlayCircle, BookOpen, GraduationCap
} from "lucide-react";

export default function ChallengesPage() {
  const { data: session, status: sessionStatus } = useSession();
  const userRole = (session?.user as any)?.role;

  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [options, setOptions] = useState<Array<{ subject: string; grade: number; domains: string[] }>>([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    subject: "Math",
    grade: "6",
    domain: "",
    minMastered: "5",
    rewardBadge: "",
    startDate: "",
    endDate: "",
  });

  const fetchChallenges = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/challenges");
      if (res.ok) {
        const data = await res.json();
        setChallenges(data.challenges || []);
        const availableOptions = Array.isArray(data.options) ? data.options : [];
        setOptions(availableOptions);
        if (availableOptions.length > 0) {
          setForm((current) => {
            const stillAvailable = availableOptions.some(
              (option: { subject: string; grade: number; domains: string[] }) =>
                option.subject === current.subject && String(option.grade) === current.grade,
            );
            return stillAvailable
              ? current
              : { ...current, subject: availableOptions[0].subject, grade: String(availableOptions[0].grade) };
          });
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setNotice({ type: "error", message: data.message || "Challenges could not be loaded." });
      }
    } catch (e) {
      console.error(e);
      setNotice({ type: "error", message: "Challenges could not be loaded. Check your connection and try again." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session) redirect("/login");
    fetchChallenges();
  }, [sessionStatus]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      const criteria = {
        subject: form.subject,
        grade: parseInt(form.grade),
        ...(form.domain ? { domain: form.domain } : {}),
        minMastered: parseInt(form.minMastered) || 5,
      };
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          criteria,
          rewardBadge: form.rewardBadge,
          startDate: form.startDate,
          endDate: form.endDate,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setForm({ title: "", description: "", subject: "Math", grade: "6", domain: "", minMastered: "5", rewardBadge: "", startDate: "", endDate: "" });
        await fetchChallenges();
        setNotice({ type: "success", message: "Challenge created successfully." });
      } else {
        const data = await res.json().catch(() => ({}));
        setNotice({ type: "error", message: data.message || "Challenge could not be created." });
      }
    } catch (e) {
      console.error(e);
      setNotice({ type: "error", message: "Challenge could not be created. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (challengeId: string) => {
    setActionId(challengeId);
    setNotice(null);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/participate`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        await fetchChallenges();
        setNotice({ type: "success", message: "You joined the challenge. Your progress is now tracked automatically." });
      } else setNotice({ type: "error", message: data.message || "You could not join this challenge." });
    } catch (e) {
      console.error(e);
      setNotice({ type: "error", message: "You could not join this challenge. Please try again." });
    } finally { setActionId(null); }
  };

  const handleRefreshProgress = async (challengeId: string) => {
    setActionId(challengeId);
    setNotice(null);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/participate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recalculate" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        await fetchChallenges();
        setNotice({ type: "success", message: "Participant progress has been recalculated." });
      } else setNotice({ type: "error", message: data.message || "Progress could not be refreshed." });
    } catch (e) {
      console.error(e);
      setNotice({ type: "error", message: "Progress could not be refreshed." });
    } finally { setActionId(null); }
  };

  const handleDelete = async (challengeId: string) => {
    if (!confirm("Delete this challenge?")) return;
    setActionId(challengeId);
    setNotice(null);
    try {
      const res = await fetch(`/api/challenges/${challengeId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        await fetchChallenges();
        setNotice({ type: "success", message: "Challenge deleted." });
      } else setNotice({ type: "error", message: data.message || "Challenge could not be deleted." });
    } catch (e) {
      console.error(e);
      setNotice({ type: "error", message: "Challenge could not be deleted." });
    } finally { setActionId(null); }
  };

  const handleToggleActive = async (challengeId: string, isActive: boolean) => {
    setActionId(challengeId);
    setNotice(null);
    try {
      const res = await fetch(`/api/challenges/${challengeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Challenge status could not be updated.");
      await fetchChallenges();
      setNotice({ type: "success", message: isActive ? "Challenge paused." : "Challenge activated." });
    } catch (e) {
      console.error(e);
      setNotice({ type: "error", message: e instanceof Error ? e.message : "Challenge status could not be updated." });
    } finally { setActionId(null); }
  };

  if (sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={40} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  const isStudent = userRole === "STUDENT";
  const subjects = [...new Set(options.map((option) => option.subject))];
  const grades = [...new Set(
    options.filter((option) => option.subject === form.subject).map((option) => option.grade),
  )].sort((a, b) => a - b);
  const domains = options.find(
    (option) => option.subject === form.subject && String(option.grade) === form.grade,
  )?.domains ?? [];
  const now = Date.now();
  const statusFor = (challenge: any) => {
    const starts = new Date(challenge.startDate).getTime();
    const ends = challenge.endDate ? new Date(challenge.endDate).getTime() : null;
    if (!challenge.isActive) return { label: "Paused", tone: "slate" };
    if (starts > now) return { label: "Upcoming", tone: "indigo" };
    if (ends && ends < now) return { label: "Ended", tone: "amber" };
    return { label: "Active", tone: "emerald" };
  };
  const activeCount = challenges.filter((challenge) => statusFor(challenge).label === "Active").length;
  const completedCount = isStudent
    ? challenges.filter((challenge) => challenge.participations?.[0]?.completedAt).length
    : challenges.reduce((sum, challenge) =>
        sum + (challenge.participations || []).filter((participation: any) => participation.completedAt).length, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/90 text-xs font-semibold mb-4 border border-white/10">
            <Gamepad2 size={14} /> Challenges
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {isStudent ? "Join Challenges" : "Manage Challenges"}
          </h1>
          <p className="text-emerald-200 mt-2">
            {isStudent
              ? "Compete with classmates and earn rewards by mastering skills."
              : "Create challenges to motivate your students to master specific skills."}
          </p>
        </div>
      </header>

      {notice && (
        <div
          role={notice.type === "error" ? "alert" : "status"}
          className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${
            notice.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {notice.type === "error" ? <AlertCircle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
          <span>{notice.message}</span>
          <button type="button" onClick={() => setNotice(null)} className="ml-auto text-current/60 hover:text-current" aria-label="Dismiss message">×</button>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Challenge summary">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Visible challenges</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{challenges.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Active now</p>
          <p className="mt-2 text-3xl font-black text-emerald-700">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">{isStudent ? "Completed" : "Student completions"}</p>
          <p className="mt-2 text-3xl font-black text-indigo-700">{completedCount}</p>
        </div>
      </section>

      {/* Teacher: Create Button */}
      {!isStudent && (
        <button
          onClick={() => setShowCreate(!showCreate)}
          disabled={options.length === 0}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 text-white px-6 py-3 rounded-xl font-semibold shadow-md transition-colors"
        >
          <Plus size={20} /> {showCreate ? "Cancel" : "New Challenge"}
        </button>
      )}

      {/* Teacher: Create Form */}
      {showCreate && !isStudent && (
        <form onSubmit={handleCreate} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Sparkles size={20} /></div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Create Challenge</h2>
              <p className="text-sm text-slate-500">Set a goal for students to master skills in a subject and domain</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-full">
              <label className="text-sm font-semibold text-slate-700 mb-1 block">Challenge Title</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="e.g. Numbers Ninja Challenge"
              />
            </div>
            <div className="col-span-full">
              <label className="text-sm font-semibold text-slate-700 mb-1 block">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-400 h-20"
                placeholder="Describe what students need to do to complete this challenge"
              />
            </div>

            {/* Goal section */}
            <div className="col-span-full">
              <p className="text-sm font-semibold text-slate-700 mb-3">Goal — students must master this many skills:</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Subject</label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                <BookOpen size={16} className="text-slate-400" />
                <select
                  value={form.subject}
                  onChange={(e) => {
                    const subject = e.target.value;
                    const firstGrade = options.find((option) => option.subject === subject)?.grade;
                    setForm({ ...form, subject, domain: "", ...(firstGrade ? { grade: String(firstGrade) } : {}) });
                  }}
                  className="bg-transparent outline-none text-sm font-bold text-slate-700 flex-1"
                >
                  {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Grade</label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                <GraduationCap size={16} className="text-slate-400" />
                <select
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: e.target.value, domain: "" })}
                  className="bg-transparent outline-none text-sm font-bold text-slate-700 flex-1"
                >
                  {grades.map((g) => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Domain (optional)</label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                <Target size={16} className="text-slate-400" />
                <select
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  className="bg-transparent outline-none text-sm font-bold text-slate-700 flex-1"
                >
                  <option value="">All domains</option>
                  {domains.map((domain) => <option key={domain} value={domain}>{domain}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Min Skills to Master</label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                <Medal size={16} className="text-slate-400" />
                <input
                  type="number"
                  min={1}
                  value={form.minMastered}
                  onChange={(e) => setForm({ ...form, minMastered: e.target.value })}
                  className="bg-transparent outline-none text-sm font-bold text-slate-700 flex-1 w-20"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Reward Badge</label>
              <input
                value={form.rewardBadge}
                onChange={(e) => setForm({ ...form, rewardBadge: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="e.g. Math Master"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Start Date</label>
                <input
                  required
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">End Date</label>
                <input
                  type="date"
                  min={form.startDate || new Date().toISOString().slice(0, 10)}
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-6 py-3 rounded-xl font-semibold shadow-md transition-colors inline-flex items-center gap-2"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            Create Challenge
          </button>
        </form>
      )}

      {/* How it works explanation for teachers */}
      {!isStudent && !showCreate && challenges.length === 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-3xl p-6">
          <h3 className="font-bold text-indigo-900 mb-3 flex items-center gap-2"><Sparkles size={18} /> How Challenges Work</h3>
          <ol className="space-y-2 text-sm text-indigo-800 list-decimal list-inside">
            <li><strong>Create</strong> — Click &quot;New Challenge&quot; above and set a goal (e.g. master 5 skills in Grade 6 Math &quot;Numbers and operations&quot;)</li>
            <li><strong>Students join</strong> — They see active challenges on their dashboard and click &quot;Join Challenge&quot;</li>
            <li><strong>Progress tracks automatically</strong> — As students complete assessments and master skills, their challenge progress updates based on how many of the required skills they&apos;ve mastered</li>
            <li><strong>Completion</strong> — Once a student meets the goal, the challenge marks as completed and they earn the reward badge</li>
          </ol>
        </div>
      )}

      {/* Challenges List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={40} className="animate-spin text-emerald-600" />
        </div>
      ) : challenges.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-16 text-center">
          <Gamepad2 size={64} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-600 mb-2">
            {isStudent ? "No Active Challenges" : "No Challenges Created"}
          </h2>
          <p className="text-slate-400">
            {isStudent
              ? "Check back later for new challenges from your teachers."
              : "Create your first challenge to motivate students."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {challenges.map((challenge) => {
            const participation = challenge.participations?.[0];
            const participantCount = challenge._count?.participations || challenge.participations?.length || 0;
            const isJoined = !!participation;
            const c = challenge.criteria as any;
            const status = statusFor(challenge);
            const statusClasses = status.tone === "emerald"
              ? "bg-emerald-50 text-emerald-700"
              : status.tone === "indigo"
                ? "bg-indigo-50 text-indigo-700"
                : status.tone === "amber"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-slate-100 text-slate-600";

            return (
              <div
                key={challenge.id}
                className={`bg-white rounded-3xl border shadow-sm overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                  status.label === "Active" ? "border-emerald-200" : "border-slate-200"
                }`}
              >
                <div className={`h-1.5 ${status.label === "Active" ? "bg-gradient-to-r from-emerald-500 to-teal-400" : status.label === "Upcoming" ? "bg-indigo-400" : "bg-slate-300"}`} />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusClasses}`}>
                      <Zap size={12} /> {status.label}
                    </div>
                    {!isStudent && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleToggleActive(challenge.id, challenge.isActive)}
                          disabled={actionId === challenge.id}
                          className="p-2 hover:bg-slate-100 disabled:opacity-40 rounded-lg text-slate-500 transition-colors"
                          title={challenge.isActive ? "Pause challenge" : "Activate challenge"}
                          aria-label={challenge.isActive ? "Pause challenge" : "Activate challenge"}
                        >
                          <PlayCircle size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(challenge.id)}
                          disabled={actionId === challenge.id}
                          className="p-2 hover:bg-red-50 disabled:opacity-40 rounded-lg text-red-500 transition-colors"
                          title="Delete"
                          aria-label="Delete challenge"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-1">{challenge.title}</h3>
                  {challenge.description && (
                    <p className="text-sm text-slate-500 mb-3">{challenge.description}</p>
                  )}

                  {/* Criteria summary */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700">
                      {c?.subject} • Grade {c?.grade}
                    </span>
                    {c?.domain && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700">
                        {c.domain}
                      </span>
                    )}
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700">
                      Master {c?.minMastered}+ skills
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-4">
                    <span className="flex items-center gap-1">
                      <Clock size={14} /> {new Date(challenge.startDate).toLocaleDateString()}
                      {challenge.endDate ? ` — ${new Date(challenge.endDate).toLocaleDateString()}` : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={14} /> {participantCount} participant{participantCount !== 1 ? "s" : ""}
                    </span>
                    {challenge.rewardBadge && (
                      <span className="flex items-center gap-1">
                        <Medal size={14} className="text-amber-500" /> {challenge.rewardBadge}
                      </span>
                    )}
                  </div>

                  {isStudent && challenge.isActive && (
                    <div className="mt-4">
                      {isJoined ? (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-slate-700">Progress</span>
                            <span className="text-sm font-bold text-emerald-600">{participation.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                              style={{ width: `${Math.min(participation.progress, 100)}%` }}
                            />
                          </div>
                          {participation.completedAt && (
                            <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                              <CheckCircle2 size={12} /> Completed {new Date(participation.completedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleJoin(challenge.id)}
                          disabled={actionId === challenge.id}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2"
                        >
                          {actionId === challenge.id && <Loader2 size={15} className="animate-spin" />}
                          Join Challenge
                        </button>
                      )}
                    </div>
                  )}

                  {!isStudent && (
                    <div className="mt-4 space-y-2">
                      <button
                        onClick={() => handleRefreshProgress(challenge.id)}
                        disabled={actionId === challenge.id}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                      >
                        {actionId === challenge.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Refresh Progress
                      </button>
                      {challenge.participations?.length > 0 && (
                        <div className="space-y-1 max-h-40 overflow-y-auto mt-2">
                          {challenge.participations.map((p: any) => (
                            <div key={p.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5">
                              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 flex-shrink-0">
                                {p.student?.name?.[0] || "?"}
                              </div>
                              <span className="text-xs font-medium text-slate-700 flex-1 truncate">{p.student?.name || "Unknown"}</span>
                              <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full ${p.progress >= 100 ? "bg-emerald-500" : "bg-indigo-500"}`}
                                  style={{ width: `${Math.min(p.progress, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-600 min-w-[28px] text-right">{p.progress}%</span>
                              {p.completedAt && <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />}
                            </div>
                          ))}
                        </div>
                      )}
                      {(!challenge.participations || challenge.participations.length === 0) && (
                        <p className="text-xs text-slate-400 italic">No participants yet</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
