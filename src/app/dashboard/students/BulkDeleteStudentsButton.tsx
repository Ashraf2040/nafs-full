"use client";

import { useState } from "react";
import { mutate } from "swr";
import toast from "react-hot-toast";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";

type Preview = { count: number; submissions: number; skillRecords: number; learningPathItems: number; trophies: number; challengeParticipations: number };

export default function BulkDeleteStudentsButton({ studentIds, onDeleted }: { studentIds: string[]; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);

  const requestPreview = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch("/api/students/bulk-delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "preview", studentIds }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not prepare the roster deletion.");
      setPreview(data);
      setOpen(true);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not prepare the roster deletion."); }
    finally { setLoading(false); }
  };

  const deleteRoster = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/students/bulk-delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", studentIds }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not delete the student roster.");
      await mutate("/api/students");
      await mutate("/api/grades");
      await mutate("/api/classes");
      toast.success(`Deleted ${data.deletedCount} student accounts and their progress records.`);
      onDeleted();
      setOpen(false);
      setPreview(null);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete the student roster."); }
    finally { setLoading(false); }
  };

  return <>
    <button type="button" onClick={() => void requestPreview()} disabled={loading || studentIds.length === 0} className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:opacity-50 sm:px-5"><Trash2 size={18} />{loading ? "Preparing…" : `Delete selected (${studentIds.length})`}</button>
    {open && preview && <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) setOpen(false); }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="bulk-student-delete-title" className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="rounded-xl bg-rose-50 p-2.5 text-rose-600"><AlertTriangle size={20} /></span><div><h2 id="bulk-student-delete-title" className="font-bold text-slate-900">Delete selected students?</h2><p className="mt-1 text-sm leading-5 text-slate-600">This permanently removes {preview.count} selected student accounts.</p></div></div><button type="button" aria-label="Close" onClick={() => setOpen(false)} disabled={loading} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div>
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-900"><p className="font-semibold">Student history is included:</p><p>{preview.submissions} quiz submissions, {preview.skillRecords} skill records, {preview.learningPathItems} learning path items, {preview.trophies} trophies, and {preview.challengeParticipations} challenge records will be deleted.</p><p className="mt-2 font-bold">This action cannot be undone.</p></div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setOpen(false)} disabled={loading} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" onClick={() => void deleteRoster()} disabled={loading || preview.count === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60">{loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}Delete {preview.count} students</button></div>
      </section>
    </div>}
  </>;
}
