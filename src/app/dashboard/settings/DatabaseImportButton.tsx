"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { AlertTriangle, CheckCircle2, FileUp, Loader2, X } from "lucide-react";
import { databaseBackupSelections, databaseBackupTableFields, diagnosisBackupTables, simulationBackupTables, type DatabaseBackupSelection, type DatabaseBackupTable } from "@/lib/databaseBackup";

const maxFileSize = 100 * 1024 * 1024;
const label = (table: DatabaseBackupSelection) => table.replace(/([a-z])([A-Z])/g, "$1 $2");
export default function DatabaseImportButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selection, setSelection] = useState<DatabaseBackupSelection>("Diagnosis");
  const [file, setFile] = useState<File | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [importing, setImporting] = useState(false);

  const selectTable = (value: DatabaseBackupSelection) => {
    setSelection(value); setFile(null); setError(null); setSuccess(null); setConfirming(false);
    if (inputRef.current) inputRef.current.value = "";
  };
  const selectFile = async (selected: File | undefined) => {
    setFile(null); setError(null); setSuccess(null); setConfirming(false);
    if (!selected) return;
    if (selected.size > maxFileSize) { setError("CSV files must be 100 MB or smaller."); return; }
    try {
      const text = (await selected.text()).replace(/^\uFEFF/, "");
      let count: number;
      if (selection === "Diagnosis" || selection === "Simulation") {
        const parsed = Papa.parse<{ __table: string; id: string; data: string }>(text, { header: true, skipEmptyLines: "greedy", preview: 200_001 });
        const allowed: DatabaseBackupTable[] = selection === "Diagnosis" ? diagnosisBackupTables : simulationBackupTables;
        if (parsed.errors.length || JSON.stringify(parsed.meta.fields) !== JSON.stringify(["__table", "id", "data"]) || parsed.data.length > 200_000 || parsed.data.some((row) => !allowed.includes(row.__table as DatabaseBackupTable) || !row.id || !row.data)) throw new Error(`Choose a CSV exported for ${label(selection)}.`);
        count = parsed.data.length;
      } else {
        const fields = databaseBackupTableFields[selection] as readonly string[];
        const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: "greedy", preview: 200_001 });
        if (parsed.errors.length || JSON.stringify(parsed.meta.fields) !== JSON.stringify(fields) || parsed.data.length > 200_000) throw new Error(`Choose a CSV exported for the ${label(selection)} table.`);
        for (const row of parsed.data) for (const field of fields) {
          if (typeof row[field] !== "string") throw new Error("The CSV is missing required columns.");
          try { JSON.parse(row[field]); } catch { throw new Error("The CSV contains invalid cell data."); }
        }
        count = parsed.data.length;
      }
      setFile(selected); setRowCount(count);
    } catch (fileError) { setError(fileError instanceof Error ? fileError.message : "The CSV could not be read."); }
  };
  const importTable = async () => {
    if (!file) return;
    setImporting(true); setError(null); setSuccess(null);
    try {
      const response = await fetch(`/api/admin/database-import?table=${encodeURIComponent(selection)}`, { method: "POST", headers: { "Content-Type": "text/csv; charset=utf-8" }, body: file });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The CSV could not be imported.");
      setSuccess(`Imported ${Number(result.importedRows).toLocaleString()} ${label(selection)} records.`); setFile(null); setConfirming(false);
      if (inputRef.current) inputRef.current.value = "";
    } catch (importError) { setError(importError instanceof Error ? importError.message : "The CSV could not be imported."); }
    finally { setImporting(false); }
  };
  const isFeature = selection === "Diagnosis" || selection === "Simulation";
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-3">
      <label className="sr-only" htmlFor="import-table">Table to import</label>
      <select id="import-table" value={selection} onChange={(event) => selectTable(event.target.value as DatabaseBackupSelection)} className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700">
        {databaseBackupSelections.map((name) => <option key={name} value={name}>{name === "Diagnosis" ? "Diagnosis (quizzes + questions)" : name === "Simulation" ? "Simulation (including linked quiz content)" : label(name)}</option>)}
      </select>
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => void selectFile(event.target.files?.[0])} />
      <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-5 py-3 font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50"><FileUp size={18} />Choose CSV</button>
    </div>
    {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
    {success && <p role="status" className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={17} />{success}</p>}
    {file && <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">{label(selection)} CSV ready</h3><p className="mt-1 break-all text-sm text-slate-600">{file.name} · {rowCount.toLocaleString()} rows</p></div><button type="button" aria-label="Remove selected CSV" onClick={() => void selectFile(undefined)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4"><p className="text-sm font-semibold text-slate-700">Matching IDs are updated; new records are added. Related grade, subject, and creator records must already exist.</p>
        {!confirming ? <button type="button" onClick={() => setConfirming(true)} className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700">Continue</button> :
          <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="flex items-start gap-2 text-sm font-semibold leading-6 text-amber-900"><AlertTriangle size={19} className="mt-0.5 shrink-0" />This will update matching {label(selection)} records in the current database{isFeature ? ". The feature CSV includes its related content tables." : "."}</p>
            <div className="mt-4 flex justify-end gap-2"><button type="button" disabled={importing} onClick={() => setConfirming(false)} className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 font-semibold text-amber-900 disabled:opacity-50">Cancel</button><button type="button" disabled={importing} onClick={() => void importTable()} className="inline-flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 font-bold text-white disabled:opacity-50">{importing ? <Loader2 size={17} className="animate-spin" /> : <FileUp size={17} />}{importing ? "Importing…" : "Import CSV"}</button></div>
          </div>}
      </div>
    </div>}
  </div>;
}
