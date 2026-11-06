"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { databaseBackupSelections, type DatabaseBackupSelection } from "@/lib/databaseBackup";

const label = (table: DatabaseBackupSelection) => table === "SimulationBundle" ? "Simulation (including linked quiz content)" : table === "Diagnosis" ? "Diagnosis (quizzes + questions)" : table.replace(/([a-z])([A-Z])/g, "$1 $2");
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
        throw new Error(result?.error || `Export failed (server returned ${response.status}). Try again or contact your administrator.`);
      }
      const csv = await response.blob(); const url = URL.createObjectURL(csv); const link = document.createElement("a");
      link.href = url; link.download = `nafs-prep-${table}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } catch (exportError) { setError(exportError instanceof TypeError ? "Could not reach the server. Check your connection and try again." : exportError instanceof Error ? exportError.message : "The CSV could not be downloaded. Try again."); }
    finally { setExporting(false); }
  };
  return <section className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="database-export-heading">
    <div className="flex items-start gap-3"><span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><Download size={20} /></span><div><h3 id="database-export-heading" className="text-lg font-extrabold text-slate-900">Export CSV</h3><p className="mt-1 text-sm leading-5 text-slate-600">Create a downloadable backup of one table or a complete feature.</p></div></div>
    <div className="mt-5 space-y-3"><label className="block text-sm font-bold text-slate-700" htmlFor="export-table">Export type</label><select id="export-table" value={table} onChange={(event) => setTable(event.target.value as DatabaseBackupSelection)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100">{databaseBackupSelections.map((name) => <option key={name} value={name}>{label(name)}</option>)}</select>{table === "SimulationBundle" && <p className="text-xs leading-5 text-slate-500">Portable content backup includes its grades, subjects, linked quizzes, and questions. It does not include account records or student attempts.</p>}<button type="button" onClick={() => void downloadTable()} disabled={exporting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">{exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}{exporting ? "Preparing your CSV…" : "Download CSV"}</button></div>
    {error && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-5 text-rose-800"><strong>Export failed:</strong> {error}</div>}
  </section>;
}
