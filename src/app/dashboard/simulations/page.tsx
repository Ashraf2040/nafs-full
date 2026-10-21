"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { BarChart3, CheckCircle2, ClipboardList, Eye, EyeOff, Loader2, Plus, PlayCircle, Trash2, Users } from "lucide-react";

type Subject = { id: string; name: string; assignments?: { grade: { level: number } }[] };
type Quiz = { id: string; title: string; grade: { level: number }; subject: Subject; _count: { questions: number } };
type QuestionDraft = { questionText: string; options: string[]; correctIndex: number };
type Sim = { id: string; title: string; creatorId: string; isPublished: boolean; grade: { level: number }; subjects: { subject: Subject; questionCount: number }[]; attempts: any[] };

const newQuestion = (): QuestionDraft => ({ questionText: "", options: ["", "", "", ""], correctIndex: 0 });

export default function SimulationsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradeLevels, setGradeLevels] = useState<number[]>([]);
  const [simulations, setSimulations] = useState<Sim[]>([]);
  const [title, setTitle] = useState("");
  const [grade, setGrade] = useState("");
  const [selectedQuizzes, setSelectedQuizzes] = useState<string[]>([]);
  const [customSubjectIds, setCustomSubjectIds] = useState<string[]>([]);
  const [customQuestions, setCustomQuestions] = useState<Record<string, QuestionDraft[]>>({});
  const [mode, setMode] = useState<"quizzes" | "custom">("quizzes");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/simulations");
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Could not load simulations");
      }
      const data = await response.json();
      setSimulations(data.simulations || []);
      setQuizzes(data.quizzes || []);
      setSubjects(data.subjects || []);
      setGradeLevels((data.grades || []).map((grade: { level: number }) => grade.level));
    } catch (error: any) {
      setMessage(error.message || "Could not load simulations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, [load]);

  const availableQuizzes = quizzes.filter(quiz => String(quiz.grade.level) === grade);
  const availableSubjects = subjects.filter(subject => role !== "TEACHER" || subject.assignments?.some(assignment => assignment.grade.level === Number(grade)));
  const distinctQuizSubjects = new Set(availableQuizzes.map(quiz => quiz.subject.id)).size;
  const stats = useMemo(() => {
    const scores = simulations.flatMap(simulation => simulation.attempts.map(attempt => attempt.score).filter((score: any) => typeof score === "number"));
    return {
      simulations: simulations.length,
      attempts: simulations.reduce((sum, simulation) => sum + simulation.attempts.length, 0),
      average: scores.length ? Math.round(scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length) : null,
    };
  }, [simulations]);

  const selectCustomSubject = (subjectId: string) => {
    setCustomSubjectIds(previous => {
      if (previous.includes(subjectId)) return previous.filter(id => id !== subjectId);
      if (previous.length >= 3) return previous;
      setCustomQuestions(current => ({ ...current, [subjectId]: current[subjectId] || [newQuestion()] }));
      return [...previous, subjectId];
    });
  };

  const updateQuestion = (subjectId: string, index: number, update: Partial<QuestionDraft>) => {
    setCustomQuestions(previous => ({
      ...previous,
      [subjectId]: (previous[subjectId] || []).map((question, questionIndex) => questionIndex === index ? { ...question, ...update } : question),
    }));
  };

  const toggleQuiz = (quiz: Quiz) => setSelectedQuizzes(previous => {
    if (previous.includes(quiz.id)) return previous.filter(id => id !== quiz.id);
    if (previous.length >= 3 || previous.some(id => availableQuizzes.find(item => item.id === id)?.subject.id === quiz.subject.id)) return previous;
    return [...previous, quiz.id];
  });

  const createSimulation = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const payload = mode === "quizzes"
        ? { title, gradeLevel: Number(grade), quizIds: selectedQuizzes }
        : {
            title,
            gradeLevel: Number(grade),
            customSubjects: customSubjectIds.map(subjectId => ({
              subjectId,
              questions: (customQuestions[subjectId] || []).map(question => ({
                questionText: question.questionText,
                options: question.options.map(option => option.trim()).filter(Boolean),
                correctAnswer: question.options[question.correctIndex]?.trim() || "",
              })),
            })),
          };
      const response = await fetch("/api/simulations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not create simulation");
      setTitle("");
      setGrade("");
      setSelectedQuizzes([]);
      setCustomSubjectIds([]);
      setCustomQuestions({});
      await load();
      setNotice("Simulation saved as a draft. Review it in Drafts, then publish it when it’s ready for students.");
    } catch (error: any) {
      setMessage(error.message || "Could not create simulation");
    } finally {
      setSaving(false);
    }
  };

  const setPublished = async (simulation: Sim, isPublished: boolean) => {
    setUpdatingId(simulation.id);
    setMessage("");
    setNotice("");
    try {
      const response = await fetch(`/api/simulations/${simulation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not update simulation");
      await load();
      setNotice(isPublished ? "Simulation published. Students in the selected grade can now access it." : "Simulation unpublished. Students can no longer access it.");
    } catch (error: any) {
      setMessage(error.message || "Could not update simulation");
    } finally {
      setUpdatingId(null);
    }
  };

  const removeSimulation = async (simulation: Sim) => {
    if (!window.confirm(`Remove “${simulation.title}” and its student results?`)) return;
    const response = await fetch(`/api/simulations/${simulation.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) setMessage(data.message || "Could not remove simulation");
    else await load();
  };

  return <div className="mx-auto max-w-7xl space-y-7">
    <header><h1 className="flex items-center gap-3 text-3xl font-black text-slate-900"><span className="rounded-xl bg-indigo-50 p-3 text-indigo-600"><ClipboardList /></span>Simulations</h1><p className="mt-2 text-slate-500">Combine two or three subjects in one test, use a bubble sheet, and review student results.</p></header>

    {role !== "STUDENT" && <div className="grid gap-4 sm:grid-cols-3"><Stat label="Simulations" value={stats.simulations} /><Stat label="Completed tests" value={stats.attempts} /><Stat label="Average score" value={stats.average === null ? "—" : `${stats.average}%`} /></div>}

    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{notice}</div>}
    {message && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</div>}

    {role !== "STUDENT" && <form onSubmit={createSimulation} className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
      <div><h2 className="flex items-center gap-2 text-xl font-bold"><Plus size={19} />Create a simulation</h2><p className="mt-1 text-sm text-slate-500">New simulations are saved as drafts. Publish after you’ve reviewed the questions.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input required value={title} onChange={event => setTitle(event.target.value)} placeholder="Simulation title" className="rounded-xl border p-3" />
        <select required value={grade} onChange={event => { setGrade(event.target.value); setSelectedQuizzes([]); setCustomSubjectIds([]); }} className="rounded-xl border p-3"><option value="">Choose grade</option>{gradeLevels.map(level => <option key={level} value={level}>Grade {level}</option>)}</select>
      </div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Question source">
        <button type="button" onClick={() => setMode("quizzes")} className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "quizzes" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>Use existing quizzes</button>
        <button type="button" onClick={() => setMode("custom")} className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "custom" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>Write my own questions</button>
      </div>

      {mode === "quizzes" ? <>
        <p className="text-sm text-slate-500">Choose two or three graded quizzes, one per subject ({selectedQuizzes.length} selected).</p>
        {grade && distinctQuizSubjects < 2 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">There aren’t two graded quiz subjects for this grade yet. Switch to <b>Write my own questions</b> or <Link href="/dashboard/quizzes/graded" target="_blank" rel="noreferrer" className="font-bold underline">create a graded quiz</Link>.</div>}
        <div className="grid gap-2 md:grid-cols-2">{availableQuizzes.map(quiz => <label key={quiz.id} className="flex cursor-pointer items-center gap-3 rounded-xl border p-3"><input type="checkbox" checked={selectedQuizzes.includes(quiz.id)} onChange={() => toggleQuiz(quiz)} disabled={!selectedQuizzes.includes(quiz.id) && (selectedQuizzes.length === 3 || selectedQuizzes.some(id => availableQuizzes.find(item => item.id === id)?.subject.id === quiz.subject.id))} /><span className="min-w-0"><b>{quiz.subject.name}</b> · {quiz.title}<small className="block text-slate-500">{quiz._count.questions} questions</small></span></label>)}</div>
      </> : <>
        <p className="text-sm text-slate-500">Choose two or three subjects, then write one or more questions for each.</p>
        <div className="flex flex-wrap gap-2">{availableSubjects.map(subject => <label key={subject.id} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"><input type="checkbox" checked={customSubjectIds.includes(subject.id)} disabled={!customSubjectIds.includes(subject.id) && customSubjectIds.length === 3} onChange={() => selectCustomSubject(subject.id)} />{subject.name}</label>)}</div>
        {customSubjectIds.map(subjectId => {
          const subject = subjects.find(item => item.id === subjectId)!;
          const questions = customQuestions[subjectId] || [];
          return <section key={subjectId} className="space-y-3 rounded-2xl border border-slate-200 p-4"><h3 className="font-bold text-slate-800">{subject.name}</h3>{questions.map((question, index) => <div key={index} className="space-y-3 rounded-xl bg-slate-50 p-4"><div className="flex items-center justify-between"><b className="text-sm">Question {index + 1}</b><button type="button" disabled={questions.length === 1} onClick={() => setCustomQuestions(current => ({ ...current, [subjectId]: current[subjectId].filter((_, i) => i !== index) }))} className="text-xs font-semibold text-rose-600 disabled:opacity-40">Remove question</button></div><textarea required value={question.questionText} onChange={event => updateQuestion(subjectId, index, { questionText: event.target.value })} placeholder="Write the question" className="w-full rounded-lg border p-3" rows={2} /><div className="grid gap-2 sm:grid-cols-2">{question.options.map((option, optionIndex) => <input key={optionIndex} required value={option} onChange={event => { const options = [...question.options]; options[optionIndex] = event.target.value; updateQuestion(subjectId, index, { options }); }} placeholder={`Choice ${String.fromCharCode(65 + optionIndex)}`} className="rounded-lg border p-2.5" />)}</div><label className="flex items-center gap-2 text-sm font-medium">Correct answer<select value={question.correctIndex} onChange={event => updateQuestion(subjectId, index, { correctIndex: Number(event.target.value) })} className="rounded-lg border p-2">{question.options.map((_, optionIndex) => <option key={optionIndex} value={optionIndex}>{String.fromCharCode(65 + optionIndex)}</option>)}</select></label></div>)}<button type="button" onClick={() => setCustomQuestions(current => ({ ...current, [subjectId]: [...(current[subjectId] || []), newQuestion()] }))} className="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700">+ Add question</button></section>;
        })}
      </>}
      <button disabled={saving || (mode === "quizzes" ? selectedQuizzes.length < 2 : customSubjectIds.length < 2 || customSubjectIds.some(id => !(customQuestions[id] || []).some(question => question.questionText.trim() && question.options.filter(option => option.trim()).length >= 2 && question.options[question.correctIndex]?.trim())))} className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white disabled:opacity-40">{saving ? "Creating…" : "Create simulation"}</button>
    </form>}

    {loading ? <div className="flex justify-center rounded-2xl border bg-white p-10"><Loader2 className="animate-spin text-indigo-600" /></div> : simulations.length === 0 ? <section className="rounded-2xl border border-dashed bg-white p-10 text-center text-slate-500">{role === "STUDENT" ? "No simulations are available yet." : "No simulations yet. Create one above; it will appear in Drafts until you publish it."}</section> : <section className="space-y-6">
    {role !== "STUDENT" && <h2 className="text-xl font-bold text-slate-900">Manage simulations</h2>}
    {(role === "STUDENT" ? [{ title: "Available simulations", items: simulations }] : [
      { title: "Drafts", items: simulations.filter(simulation => !simulation.isPublished) },
      { title: "Published", items: simulations.filter(simulation => simulation.isPublished) },
    ]).map(group => group.items.length > 0 && <div key={group.title} className="space-y-3">
      <h3 className="text-lg font-bold text-slate-800">{group.title} <span className="text-sm font-medium text-slate-400">({group.items.length})</span></h3>
      {group.items.map(simulation => {
      const completed = simulation.attempts[0];
      return <article key={simulation.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5 shadow-sm"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="text-lg font-bold">{simulation.title}</h4>{role !== "STUDENT" && <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${simulation.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{simulation.isPublished ? "Published" : "Draft"}</span>}</div><p className="mt-1 text-sm text-slate-500">Grade {simulation.grade.level} · {simulation.subjects.map(item => item.subject.name).join(" + ")} · {simulation.subjects.reduce((sum, item) => sum + item.questionCount, 0)} questions</p>{role !== "STUDENT" && simulation.isPublished && <div className="mt-3 flex flex-wrap gap-2">{simulation.attempts.map((attempt: any) => <span key={attempt.id} className="rounded-lg bg-slate-50 px-2 py-1 text-xs">{attempt.student?.name || attempt.student?.email}: {attempt.score ?? "—"}%</span>)}</div>}</div>{role === "STUDENT" ? <div>{completed ? <span className="flex items-center gap-2 font-semibold text-emerald-700"><CheckCircle2 />Completed · {completed.score}%</span> : <Link href={`/dashboard/simulations/${simulation.id}`} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white"><PlayCircle size={18} />Start simulation</Link>}</div> : <div className="flex flex-wrap items-center gap-2"><Link href={`/dashboard/simulations/${simulation.id}?preview=1`} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50"><PlayCircle size={16} />Preview</Link>{simulation.isPublished && <span className="flex items-center gap-2 px-2 text-sm text-slate-500"><Users size={16} />{simulation.attempts.length} completions</span>}{(role === "ADMIN" || simulation.creatorId === userId) && <><button onClick={() => void setPublished(simulation, !simulation.isPublished)} disabled={updatingId === simulation.id} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 ${simulation.isPublished ? "border border-slate-200 text-slate-700 hover:bg-slate-50" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}><span className="sr-only">{simulation.isPublished ? "Unpublish" : "Publish"} </span>{updatingId === simulation.id ? <Loader2 size={16} className="animate-spin" /> : simulation.isPublished ? <EyeOff size={16} /> : <Eye size={16} />}{updatingId === simulation.id ? "Saving…" : simulation.isPublished ? "Unpublish" : "Publish for students"}</button><button onClick={() => void removeSimulation(simulation)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" aria-label={`Remove ${simulation.title}`} title="Remove simulation"><Trash2 size={17} /></button></>}</div>}</article>;
    })}
    </div>)}
    </section>}
  </div>;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-900"><BarChart3 size={20} className="text-indigo-500" />{value}</p></div>;
}
