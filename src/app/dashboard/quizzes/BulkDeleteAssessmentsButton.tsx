"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, Trash2 } from "lucide-react";

type AssessmentType = "PRACTICE" | "QUIZ";

export default function BulkDeleteAssessmentsButton({ assessmentType }: { assessmentType: AssessmentType }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const label = assessmentType === "PRACTICE" ? "practices" : "quizzes";
  const title = assessmentType === "PRACTICE" ? "Delete all practices?" : "Delete all quizzes?";

  const request = async (action: "preview" | "delete") => {
    const response = await fetch("/api/quizzes/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, assessmentType }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `Could not ${action} ${label}`);
    return data;
  };

  const confirmDelete = async (toastId: string) => {
    setLoading(true);
    try {
      const result = await request("delete");
      toast.dismiss(toastId);
      toast.success(`Deleted ${result.deletedCount} ${label}.`);
      router.refresh();
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(error instanceof Error ? error.message : `Could not delete ${label}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { count, blockedByResults, linkedToSimulations } = await request("preview");
      if (!count) {
        toast("There are no " + label + " to delete.");
        return;
      }
      const blocked = blockedByResults > 0 || linkedToSimulations > 0;
      toast.custom((t) => (
        <div role="alertdialog" aria-labelledby="bulk-delete-title" className="w-[min(92vw,440px)] rounded-2xl border border-rose-200 bg-white p-5 shadow-xl">
          <h2 id="bulk-delete-title" className="font-bold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm text-slate-600">This will permanently delete {count} {label}{assessmentType === "PRACTICE" ? " and their completion records" : ""}. This cannot be undone.</p>
          {blocked && <p className="mt-2 text-sm font-medium text-amber-700">Deletion is blocked while {blockedByResults ? `${blockedByResults} quiz${blockedByResults === 1 ? " has" : "zes have"} student submissions` : "assessments are linked to simulations"}{linkedToSimulations ? `${blockedByResults ? " or " : ""}${linkedToSimulations} assessment${linkedToSimulations === 1 ? " is" : "s are"} linked to simulations` : ""}. You can still cancel.</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => toast.dismiss(t.id)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">Cancel</button>
            <button type="button" disabled={blocked || loading} onClick={() => void confirmDelete(t.id)} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {loading && <Loader2 size={14} className="animate-spin" />} Delete all {label}
            </button>
          </div>
        </div>
      ), { duration: Infinity });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Could not prepare to delete ${label}.`);
    } finally {
      setLoading(false);
    }
  };

  return <button type="button" onClick={() => void handleClick()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-60">
    {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
    Delete all {label}
  </button>;
}
