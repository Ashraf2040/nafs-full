"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, ArrowRight, BookOpenCheck, Brain, CheckCircle2, ChevronDown, ClipboardList, FlaskConical, Loader2, Pencil, Eye, Send, Sparkles, Plus, X, Trash2, AlertTriangle, RotateCcw } from "lucide-react";

type QuizSummary = { id: string; title: string; subject: string; grade: number; isPublished: boolean; questionCount: number };

export default function DiagnosticHub({ quizzes }: { quizzes: QuizSummary[] }) {
  const [openGrade, setOpenGrade] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createGrade, setCreateGrade] = useState("3");
  const [createSubject, setCreateSubject] = useState("Math");
  const [createTitle, setCreateTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<QuizSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const subjectsFor = (grade: number) => grade === 3
    ? ["Math", "English"]
    : ["Math", "English", "Science"];

  const createDraft = async (subjectName: string) => {
    const key = `${subjectName}`;
    setBusy(key);
    setMessage("");
    try {
      const response = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not prepare the assessment.");
      router.refresh();
      router.push(`/dashboard/diagnostic/preview/${data.quizId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  const publish = async (quizId: string) => {
    setBusy(quizId);
    setMessage("");
    try {
      const response = await fetch(`/api/quizzes/${quizId}/publish`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not publish the diagnostic.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  const createDiagnostic = async () => {
    setBusy("new-diagnostic");
    setMessage("");
    try {
      const response = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradeTarget: Number(createGrade), subjectName: createSubject, title: createTitle }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not create the diagnostic draft.");
      router.push(`/dashboard/quizzes/edit/${data.quizId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  const deleteDiagnostic = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setMessage("");
    try {
      const response = await fetch(`/api/quizzes/${deleteTarget.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete this diagnostic.");
      setDeleteTarget(null);
      router.refresh();
    } catch (error) {
      setDeleteTarget(null);
      setMessage(error instanceof Error ? error.message : "Could not delete this diagnostic.");
    } finally {
      setDeleting(false);
    }
  };

  const restoreSourceVersion = async (quiz: QuizSummary) => {
    if (!window.confirm(`Replace this Grade 3 ${quiz.subject} diagnostic with the exact Preparation Form (A) questions${quiz.subject === "Math" ? " and visuals" : " and reading passage"}? The assessment will return to draft status.`)) return;
    setBusy(`restore-${quiz.id}`);
    setMessage("");
    try {
      const response = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectName: quiz.subject, quizId: quiz.id, refreshSource: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not restore the booklet version.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not restore the booklet version.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-7">
      {message && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{message}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div><p className="text-sm font-extrabold text-slate-900">Build a new diagnostic</p><p className="mt-1 text-xs text-slate-500">Start a draft for any supported grade and subject.</p></div>
        <button onClick={() => setShowCreate(!showCreate)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700">{showCreate ? <X size={16} /> : <Plus size={16} />}{showCreate ? "Close" : "Create diagnostic"}</button>
      </div>

      {showCreate && <section className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">New draft</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">Set up the assessment</h2><p className="mt-1 text-sm text-slate-500">Name this diagnostic. The next step opens the question editor, where you can add questions, answers, and visuals.</p></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Grade<select value={createGrade} onChange={(event) => setCreateGrade(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-indigo-400"><option value="3">Grade 3</option><option value="6">Grade 6</option><option value="9">Grade 9</option></select></label>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Subject<select value={createSubject} onChange={(event) => setCreateSubject(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-indigo-400"><option>Math</option><option>English</option><option>Science</option></select></label>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Assessment name<input required value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} placeholder={`Grade ${createGrade} ${createSubject} Diagnostic - Draft`} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none placeholder:font-normal focus:border-indigo-400" /></label>
        </div>
        <div className="mt-5 flex justify-end"><button onClick={createDiagnostic} disabled={busy === "new-diagnostic" || !createTitle.trim()} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60">{busy === "new-diagnostic" ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}{busy === "new-diagnostic" ? "Creating draft..." : "Create draft and add questions"}</button></div>
      </section>}

      <section className="grid gap-4 md:grid-cols-3" aria-label="Choose grade">
        {[3, 6, 9].map((grade) => {
          const active = openGrade === grade;
          return (
            <button key={grade} onClick={() => setOpenGrade(active ? null : grade)} aria-expanded={active}
              className={`group relative overflow-hidden rounded-3xl border p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg ${active ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100" : "border-slate-200 bg-white hover:border-indigo-200"}`}>
              <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${grade === 3 ? "bg-amber-100 text-amber-700" : grade === 6 ? "bg-sky-100 text-sky-700" : "bg-violet-100 text-violet-700"}`}><BookOpenCheck size={23} /></div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">NAFS assessment</p>
              <div className="mt-1 flex items-center justify-between"><h2 className="text-2xl font-extrabold text-slate-900">Grade {grade}</h2><ChevronDown size={19} className={`text-slate-400 transition-transform ${active ? "rotate-180" : ""}`} /></div>
              <p className="mt-2 text-sm text-slate-500">{grade === 3 ? "English and mathematics diagnostics" : "Explore subject assessments"}</p>
            </button>
          );
        })}
      </section>

      {openGrade !== null && <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Grade {openGrade}</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">Choose a subject</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{subjectsFor(openGrade).length} subjects</span></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {subjectsFor(openGrade).map((subject) => {
            const quiz = quizzes.find((item) => item.grade === openGrade && item.subject.toLowerCase() === subject.toLowerCase());
            const Icon = subject === "Science" ? FlaskConical : subject === "Math" ? Brain : ClipboardList;
            return <article key={subject} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="flex items-start justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm"><Icon size={20} /></div>{quiz ? <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${quiz.isPublished ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{quiz.isPublished ? "Published" : "Draft"}</span> : <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-600">Coming soon</span>}</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{subject}</h3>
              <p className="mt-1 min-h-10 text-sm leading-5 text-slate-500">{openGrade === 3 && (subject === "Math" || subject === "English") ? `${quiz?.questionCount ?? (subject === "Math" ? 8 : 5)} questions from Preparation Form (A)` : "Assessment content can be added for this grade and subject."}</p>
              {quiz ? <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/dashboard/diagnostic/preview/${quiz.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"><Eye size={14} /> View</Link>
                <Link href={`/dashboard/quizzes/edit/${quiz.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"><Pencil size={14} /> Edit</Link>
                {!quiz.isPublished && <button onClick={() => publish(quiz.id)} disabled={busy === quiz.id} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60">{busy === quiz.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Publish</button>}
                {quiz.isPublished && <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"><CheckCircle2 size={14} /> Live</span>}
              </div> : openGrade === 3 && (subject === "Math" || subject === "English") ? <button onClick={() => createDraft(subject)} disabled={busy === subject} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60">{busy === subject ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Prepare draft <ArrowRight size={15} /></button> : <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">Assessment content coming soon</span>}
            </article>;
          })}
        </div>
      </section>}

      {quizzes.length > 0 && <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Your library</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">Saved diagnostics</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{quizzes.length} assessment{quizzes.length === 1 ? "" : "s"}</span></div>
        <div className="space-y-3">{quizzes.map((quiz) => <article key={quiz.id} className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-900">{quiz.title}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${quiz.isPublished ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{quiz.isPublished ? "Published" : "Draft"}</span></div><p className="mt-1 text-xs text-slate-500">Grade {quiz.grade} · {quiz.subject} · {quiz.questionCount} question{quiz.questionCount === 1 ? "" : "s"}</p></div><div className="flex flex-wrap gap-2"><Link href={`/dashboard/diagnostic/preview/${quiz.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"><Eye size={14} /> View</Link><Link href={`/dashboard/quizzes/edit/${quiz.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"><Pencil size={14} /> Edit</Link>{!quiz.isPublished && <button onClick={() => publish(quiz.id)} disabled={busy === quiz.id} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60">{busy === quiz.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Publish</button>}{quiz.grade === 3 && ["math", "english"].includes(quiz.subject.toLowerCase()) && quiz.title === `NAFS Grade 3 Diagnostic - ${quiz.subject}` && <button onClick={() => restoreSourceVersion(quiz)} disabled={busy === `restore-${quiz.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-indigo-700 ring-1 ring-indigo-100 hover:bg-indigo-50 disabled:opacity-60">{busy === `restore-${quiz.id}` ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Restore booklet version</button>}<button onClick={() => setDeleteTarget(quiz)} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-rose-600 ring-1 ring-rose-100 hover:bg-rose-50"><Trash2 size={14} /> Delete</button></div></article>)}</div>
      </section>}

      <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <Link href="/dashboard/diagnostic/analysis" className="group rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 p-6 text-white shadow-lg transition-transform hover:-translate-y-0.5 sm:p-7">
          <div className="flex items-start justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-indigo-200"><Activity size={23} /></span><ArrowRight className="text-white/50 transition-transform group-hover:translate-x-1" /></div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-indigo-200">Student outcomes</p><h2 className="mt-1 text-2xl font-extrabold">Diagnostic analysis</h2><p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100/75">See mastered and missed outcomes by student, with item-level evidence and coverage notes.</p>
        </Link>
        <div className="rounded-3xl border border-indigo-100 bg-indigo-50/70 p-6 sm:p-7"><div className="flex items-center gap-2 text-indigo-700"><Sparkles size={17} /><span className="text-xs font-extrabold uppercase tracking-[0.14em]">Adding question assets</span></div><h2 className="mt-3 text-lg font-bold text-slate-900">A reusable image library</h2><p className="mt-2 text-sm leading-6 text-slate-600">Store diagrams and passage images in the app’s media storage, then attach each image to its question. Keep the original booklet as a source reference and use cropped, high-resolution figures for clear student viewing.</p></div>
      </section>

      {deleteTarget && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setDeleteTarget(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="delete-diagnostic-title" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><AlertTriangle size={23} /></div>
          <h2 id="delete-diagnostic-title" className="mt-4 text-xl font-extrabold text-slate-900">Delete this diagnostic?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600"><strong>{deleteTarget.title}</strong> and its questions will be permanently removed. Diagnostics with student submissions cannot be deleted.</p>
          <div className="mt-6 flex justify-end gap-3"><button onClick={() => setDeleteTarget(null)} disabled={deleting} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Cancel</button><button onClick={deleteDiagnostic} disabled={deleting} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60">{deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}{deleting ? "Deleting..." : "Delete diagnostic"}</button></div>
        </section>
      </div>}
    </div>
  );
}
