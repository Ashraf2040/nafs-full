"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

export default function DatabaseExportButton() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadBackup = async () => {
    setExporting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/database-export", { cache: "no-store" });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "The database backup could not be downloaded.");
      }

      const backup = await response.blob();
      const url = URL.createObjectURL(backup);
      const link = document.createElement("a");
      link.href = url;
      link.download = `nafs-prep-csv-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "The database backup could not be downloaded.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={downloadBackup}
        disabled={exporting}
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
      >
        {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
        {exporting ? "Preparing backup…" : "Export CSV backup"}
      </button>
      {error && <p role="alert" className="mt-3 text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}
