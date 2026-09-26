"use client";
import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function BackfillButton() {
  const [running, setRunning] = useState(false);

  const handleBackfill = async () => {
    if (!confirm("Link all unlinked quizzes to their best-matching outcomes? This only affects quizzes without an outcome.")) return;
    setRunning(true);
    try {
      const res = await fetch("/api/admin/backfill-outcomes", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Linked ${data.linked} quizzes. Refreshing...`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error(data.error || "Backfill failed");
      }
    } catch {
      toast.error("Error running backfill");
    } finally {
      setRunning(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBackfill}
      disabled={running}
      className="inline-flex h-11 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50"
    >
      {running ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
      {running ? "Linking..." : "Link Outcomes"}
    </button>
  );
}
