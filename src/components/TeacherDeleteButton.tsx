"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";

type Counts = { assignments: number; quizzes: number; createdChallenges: number; createdStudyGuides: number };

export default function TeacherDeleteButton({ teacherId, teacherName }: { teacherId: string; teacherName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Counts | null>(null);

  const openConfirmation = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/teachers/${teacherId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "preview" }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not prepare the teacher account deletion.");
      setCounts(data.counts);
      setOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not prepare deletion.");
    } finally { setLoading(false); }
  };

  const removeTeacher = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/teachers/${teacherId}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not delete this teacher account.");
      toast.success("Teacher account deleted. Created quizzes and resources were preserved.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete this teacher account.");
    } finally { setLoading(false); }
  };

  return <>
    <button type="button" onClick={() => void openConfirmation()} disabled={loading} aria-label={`Delete ${teacherName}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60">
      {loading && !open ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}<span className="hidden 2xl:inline">Delete</span>
    </button>
    {open && counts && <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) setOpen(false); }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="teacher-delete-title" className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="rounded-xl bg-rose-50 p-2.5 text-rose-600"><AlertTriangle size={20} /></span><div><h2 id="teacher-delete-title" className="font-bold text-slate-900">Delete {teacherName}?</h2><p className="mt-1 text-sm leading-5 text-slate-600">This permanently removes their teacher login and assignments.</p></div></div><button type="button" aria-label="Close" onClick={() => setOpen(false)} disabled={loading} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"><p><strong>{counts.quizzes}</strong> authored quizzes and their student results will remain; quiz ownership will be cleared.</p><p className="mt-2"><strong>{counts.createdChallenges}</strong> challenges and <strong>{counts.createdStudyGuides}</strong> study guides will be reassigned to your administrator account.</p><p className="mt-2"><strong>{counts.assignments}</strong> subject and grade assignments will be removed.</p></div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setOpen(false)} disabled={loading} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" onClick={() => void removeTeacher()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60">{loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}Delete teacher</button></div>
      </section>
    </div>}
  </>;
}
