"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Check, ExternalLink, FileText, Loader2, Plus, UploadCloud } from "lucide-react";
import { useSession } from "next-auth/react";

type StudyGuide = { id: string; title: string; fileName: string; fileUrl: string; isPublished: boolean; createdAt: string; subject: { id: string; name: string }; grade: { id: string; level: number }; creator?: { name: string | null } };
type Choice = { id: string; name?: string; level?: number };

export default function StudyGuidesPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const isStudent = role === "STUDENT";
  const [guides, setGuides] = useState<StudyGuide[]>([]);
  const [subjects, setSubjects] = useState<Choice[]>([]);
  const [grades, setGrades] = useState<Choice[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const initializedFilters = useRef(false);

  const loadGuides = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/study-guides", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Study guides could not be loaded.");
      setGuides(data.guides);
      setSubjects(data.subjects);
      setGrades(data.grades);
      if (!initializedFilters.current) {
        if (data.grades[0]) setGradeId(data.grades[0].id);
        initializedFilters.current = true;
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [isStudent]);

  useEffect(() => { void loadGuides(); }, [loadGuides]);

  const visibleGuides = useMemo(() => guides.filter((guide) =>
    (!subjectId || guide.subject.id === subjectId) && (!gradeId || guide.grade.id === gradeId)), [guides, subjectId, gradeId]);

  const uploadGuide = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !title.trim()) return;
    setBusy(true); setError(""); setNotice("");
    const form = new FormData();
    form.set("title", title.trim()); form.set("subjectId", subjectId); form.set("gradeId", gradeId); form.set("file", file);
    try {
      const response = await fetch("/api/study-guides", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed.");
      setTitle(""); setFile(null); setNotice("Guide uploaded. Publish it when it is ready for students.");
      await loadGuides();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  const publishGuide = async (guide: StudyGuide) => {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/study-guides", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: guide.id, isPublished: !guide.isPublished }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The guide could not be updated.");
      setNotice(guide.isPublished ? "Guide unpublished." : "Study guide published for students.");
      await loadGuides();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  return <div className="mx-auto max-w-6xl space-y-8 py-6">
    <header className="rounded-3xl bg-gradient-to-r from-indigo-700 to-violet-600 p-8 text-white shadow-lg">
      <div className="flex items-center gap-4"><div className="rounded-2xl bg-white/15 p-3"><BookOpen size={30} /></div><div><p className="text-sm font-bold uppercase tracking-widest text-indigo-100">Learning Library</p><h1 className="text-3xl font-black">Study Guides</h1><p className="mt-1 text-indigo-100">{isStudent ? "Review your class materials before you start a quiz." : "Share helpful PDFs with students in your assigned classes."}</p></div></div>
    </header>

    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{notice}</div>}

    {!isStudent && <form onSubmit={uploadGuide} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div><h2 className="text-xl font-black text-slate-800">Add study material</h2><p className="mt-1 text-sm text-slate-500">Upload a PDF, then publish it to make it available to students.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm font-bold text-slate-700">Subject<select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3"><option value="">Choose a subject</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label className="text-sm font-bold text-slate-700">Grade<select value={gradeId} onChange={(e) => setGradeId(e.target.value)} required className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3"><option value="">Choose a grade</option>{grades.map((g) => <option key={g.id} value={g.id}>Grade {g.level}</option>)}</select></label>
        <label className="text-sm font-bold text-slate-700 sm:col-span-2 lg:col-span-1">Guide title<input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160} placeholder="e.g. Fractions review" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" /></label>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/60 px-4 py-3 text-sm font-bold text-indigo-800"><UploadCloud size={20} />{file?.name || "Choose a PDF (up to 15 MB)"}<input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label><button disabled={busy || !file || !title.trim() || !subjectId || !gradeId} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{busy ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Upload guide</button></div>
    </form>}

    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-black text-slate-800">{isStudent ? "Ready to study" : "Your class materials"}</h2><p className="mt-1 text-slate-500">{isStudent ? "Published guides for your grade" : "Select a subject and grade to review guides."}</p></div><div className="flex gap-3"><select aria-label="Filter by subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold"><option value="">All subjects</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>{!isStudent && <select aria-label="Filter by grade" value={gradeId} onChange={(e) => setGradeId(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold"><option value="">All grades</option>{grades.map((g) => <option key={g.id} value={g.id}>Grade {g.level}</option>)}</select>}</div></div>
      {loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-600" size={32} /></div> : visibleGuides.length ? <div className="grid gap-5 md:grid-cols-2">{visibleGuides.map((guide) => <article key={guide.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-start justify-between gap-4 p-5"><div className="flex min-w-0 gap-3"><span className="rounded-xl bg-rose-50 p-3 text-rose-600"><FileText size={22} /></span><div className="min-w-0"><h3 className="truncate text-lg font-black text-slate-800">{guide.title}</h3><p className="mt-1 text-sm text-slate-500">{guide.subject.name} · Grade {guide.grade.level}</p><p className="mt-1 truncate text-xs text-slate-400">{guide.fileName}{guide.creator?.name ? ` · ${guide.creator.name}` : ""}</p></div></div>{!isStudent && <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${guide.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{guide.isPublished ? "Published" : "Draft"}</span>}</div><div className="flex items-center justify-between border-t border-slate-100 px-5 py-3"><a href={guide.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:text-indigo-900"><ExternalLink size={16} /> Open and study</a>{!isStudent && <button disabled={busy} onClick={() => void publishGuide(guide)} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${guide.isPublished ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>{guide.isPublished ? "Unpublish" : <><Check size={16} /> Publish to students</>}</button>}</div></article>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><BookOpen className="mx-auto mb-3 text-slate-300" size={34} /><p className="font-bold text-slate-700">{isStudent ? "No study guides are published for this selection yet." : "No guides found for this selection."}</p><p className="mt-1 text-sm text-slate-500">{isStudent ? "Your teacher’s materials will appear here when they are ready." : "Upload a PDF above to get started."}</p></div>}
    </section>
  </div>;
}
