"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { databaseBackupSelections, type DatabaseBackupSelection } from "@/lib/databaseBackup";

const label = (table: DatabaseBackupSelection) => table.replace(/([a-z])([A-Z])/g, "$1 $2");
export default function DatabaseExportButton() {
  const [table, setTable] = useState<DatabaseBackupSelection>("Diagnosis");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const downloadTable = async () => {
    setExporting(true); setError(null);
    try {
      const response = await fetch(`/api/admin/database-export?table=${encodeURIComponent(table)}`, { cache: "no-store" });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "The CSV could not be downloaded.");
      }
      const csv = await response.blob(); const url = URL.createObjectURL(csv); const link = document.createElement("a");
      link.href = url; link.download = `nafs-prep-${table}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } catch (exportError) { setError(exportError instanceof Error ? exportError.message : "The CSV could not be downloaded."); }
    finally { setExporting(false); }
  };
  return <div className="flex flex-wrap items-center gap-3">
    <label className="sr-only" htmlFor="export-table">Table to export</label>
    <select id="export-table" value={table} onChange={(event) => setTable(event.target.value as DatabaseBackupSelection)} className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700">
      {databaseBackupSelections.map((name) => <option key={name} value={name}>{name === "Diagnosis" ? "Diagnosis (quizzes + questions)" : name === "Simulation" ? "Simulation (including linked quiz content)" : label(name)}</option>)}
    </select>
    <button type="button" onClick={() => void downloadTable()} disabled={exporting} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">
      {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}{exporting ? "Preparing CSV…" : "Export CSV"}
    </button>
    {error && <p role="alert" className="w-full text-sm font-medium text-red-700">{error}</p>}
  </div>;
}
