"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { AlertTriangle, CheckCircle2, FileUp, Loader2, ShieldCheck, X } from "lucide-react";
import { databaseBackupSelections, databaseBackupTableFields, diagnosisBackupTables, simulationBackupTables, type DatabaseBackupSelection, type DatabaseBackupTable } from "@/lib/databaseBackup";

const maxFileSize = 100 * 1024 * 1024;
const label = (table: DatabaseBackupSelection) => table === "SimulationBundle" ? "Full Simulation backup" : table === "Diagnosis" ? "Full Diagnosis backup (quizzes + questions)" : table === "Simulation" ? "Simulation table only" : table.replace(/([a-z])([A-Z])/g, "$1 $2");
type Preview = { total: number; tables: [string, number][] };

export default function DatabaseImportButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selection, setSelection] = useState<DatabaseBackupSelection>("SimulationBundle");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [importing, setImporting] = useState(false);

  const selectTable = (value: DatabaseBackupSelection) => {
    setSelection(value); setFile(null); setPreview(null); setError(null); setSuccess(null); setReviewing(false);
    if (inputRef.current) inputRef.current.value = "";
  };
  const selectFile = async (selected?: File) => {
    setFile(null); setPreview(null); setError(null); setSuccess(null); setReviewing(false);
    if (!selected) return;
    if (!selected.size) { setError("The selected file is empty. Choose a CSV export with data."); return; }
    if (selected.size > maxFileSize) { setError("This file is larger than the 100 MB limit. Choose a smaller CSV."); return; }
    if (!selected.name.toLowerCase().endsWith(".csv")) { setError("This file does not have a .csv extension. Choose a CSV export."); return; }
    try {
      const text = (await selected.text()).replace(/^\uFEFF/, "");
      let detectedSelection = selection;
      const headerCheck = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: "greedy", preview: 1 });
      if (JSON.stringify(headerCheck.meta.fields) === JSON.stringify(["__table", "id", "data"])) {
        const tableRows = Papa.parse<{ __table: string }>(text, { header: true, skipEmptyLines: "greedy" });
        const tableNames = new Set(tableRows.data.map((row) => row.__table));
        if ([...tableNames].some((name) => ["Simulation", "SimulationSubject", "SimulationQuestion"].includes(name))) detectedSelection = "SimulationBundle";
        else if ([...tableNames].some((name) => diagnosisBackupTables.includes(name as DatabaseBackupTable))) detectedSelection = "Diagnosis";
      } else {
        const matchingTable = databaseBackupSelections.find((name) => name !== "Diagnosis" && name !== "SimulationBundle" && JSON.stringify(headerCheck.meta.fields) === JSON.stringify(databaseBackupTableFields[name]));
        if (matchingTable) detectedSelection = matchingTable;
      }
      if (detectedSelection !== selection) setSelection(detectedSelection);
      let counts: Record<string, number>;
      if (detectedSelection === "Diagnosis" || detectedSelection === "SimulationBundle") {
        const parsed = Papa.parse<{ __table: string; id: string; data: string }>(text, { header: true, skipEmptyLines: "greedy", preview: 200_001 });
        const allowed: DatabaseBackupTable[] = detectedSelection === "Diagnosis" ? diagnosisBackupTables : simulationBackupTables;
        if (parsed.errors.length) throw new Error(`Could not read this CSV: ${parsed.errors[0].message}. Re-export the ${label(detectedSelection)} CSV and try again.`);
        if (JSON.stringify(parsed.meta.fields) !== JSON.stringify(["__table", "id", "data"])) throw new Error(`The CSV columns do not match a ${label(detectedSelection)} export. Choose the matching export file.`);
        if (parsed.data.length > 200_000) throw new Error("This CSV contains more than 200,000 rows, which is above the import limit.");
        if (!parsed.data.length) throw new Error("This CSV contains no records to import.");
        counts = {};
        const seen = new Set<string>();
        for (const [index, row] of parsed.data.entries()) {
          if (!allowed.includes(row.__table as DatabaseBackupTable)) throw new Error(`Row ${index + 2} contains an unexpected table (${row.__table || "blank"}) for this import.`);
          if (!row.id || !row.data) throw new Error(`Row ${index + 2} is missing its record ID or data.`);
          let data: unknown;
          try { data = JSON.parse(row.data); } catch { throw new Error(`Row ${index + 2} contains invalid JSON in its data column.`); }
          if (!data || typeof data !== "object" || Array.isArray(data) || (data as Record<string, unknown>).id !== row.id) throw new Error(`Row ${index + 2} has a record ID that does not match its data.`);
          const key = `${row.__table}:${row.id}`;
          if (seen.has(key)) throw new Error(`The CSV repeats record ${row.id} in ${row.__table}. Remove the duplicate row or export the file again.`);
          seen.add(key); counts[row.__table] = (counts[row.__table] ?? 0) + 1;
        }
      } else {
        const fields = databaseBackupTableFields[detectedSelection] as readonly string[];
        const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: "greedy", preview: 200_001 });
        if (parsed.errors.length) throw new Error(`Could not read this CSV: ${parsed.errors[0].message}. Re-export the ${label(selection)} CSV and try again.`);
        if (JSON.stringify(parsed.meta.fields) !== JSON.stringify(fields)) throw new Error(`The CSV columns do not match the ${label(detectedSelection)} table. Choose the matching export file.`);
        if (parsed.data.length > 200_000) throw new Error("This CSV contains more than 200,000 rows, which is above the import limit.");
        if (!parsed.data.length) throw new Error("This CSV contains no records to import.");
        const seen = new Set<string>();
        for (const [index, row] of parsed.data.entries()) {
          for (const field of fields) {
            if (typeof row[field] !== "string") throw new Error(`Row ${index + 2} is missing the required “${field}” column value.`);
            try { JSON.parse(row[field]); } catch { throw new Error(`Row ${index + 2} has invalid data in the “${field}” column.`); }
          }
          const id = JSON.parse(row.id) as unknown;
          if (typeof id !== "string" || !id) throw new Error(`Row ${index + 2} has no valid record ID.`);
          if (seen.has(id)) throw new Error(`The CSV repeats record ID ${id}. Remove the duplicate row or export the file again.`);
          seen.add(id);
        }
        counts = { [detectedSelection]: parsed.data.length };
      }
      setFile(selected);
      setPreview({ total: Object.values(counts).reduce((sum, count) => sum + count, 0), tables: Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)) });
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "The CSV could not be checked. Confirm it is a valid UTF-8 CSV and try again.");
    }
  };
  const importTable = async () => {
    if (!file || !preview) return;
    setImporting(true); setError(null); setSuccess(null);
    try {
      const response = await fetch(`/api/admin/database-import?table=${encodeURIComponent(selection)}`, { method: "POST", headers: { "Content-Type": "text/csv; charset=utf-8" }, body: file });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || `Import failed (server returned ${response.status}). Check the CSV and that all related records already exist.`);
      setSuccess(`Imported ${Number(result.importedRows).toLocaleString()} ${label(selection)} records successfully.`);
      setFile(null); setPreview(null); setReviewing(false);
      if (inputRef.current) inputRef.current.value = "";
    } catch (importError) {
      setReviewing(false);
      setError(importError instanceof TypeError ? "Could not reach the server. Check your connection and try importing again." : importError instanceof Error ? importError.message : "The import failed unexpectedly. Try again; if it continues, contact your administrator.");
    } finally { setImporting(false); }
  };
  const isFeature = selection === "Diagnosis" || selection === "SimulationBundle";
  return <section className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="database-import-heading">
    <div className="flex items-start gap-3"><span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-700"><FileUp size={20} /></span><div><h3 id="database-import-heading" className="text-lg font-extrabold text-slate-900">Import CSV</h3><p className="mt-1 text-sm leading-5 text-slate-600">Check the file and record count before applying changes.</p></div></div>
    <div className="mt-5 space-y-3">
      <label className="block text-sm font-bold text-slate-700" htmlFor="import-table">Import type</label>
      <select id="import-table" value={selection} onChange={(event) => selectTable(event.target.value as DatabaseBackupSelection)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100">
        <optgroup label="Full backups">
          {(["SimulationBundle", "Diagnosis"] as const).map((name) => <option key={name} value={name}>{label(name)}</option>)}
        </optgroup>
        <optgroup label="Individual tables">
          {databaseBackupSelections.filter((name): name is Exclude<DatabaseBackupSelection, "Diagnosis" | "SimulationBundle"> => name !== "Diagnosis" && name !== "SimulationBundle").map((name) => <option key={name} value={name}>{label(name)}</option>)}
        </optgroup>
      </select>
      <p className="text-xs leading-5 text-slate-500">Records with matching IDs will be updated; new IDs will be added. Related records must already exist.</p>
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => void selectFile(event.target.files?.[0])} />
      <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-3 font-bold text-indigo-700 transition hover:bg-indigo-50"><FileUp size={18} />Choose CSV file</button>
    </div>
    {error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-5 text-rose-800"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><p><strong>Import needs attention:</strong> {error}</p></div>}
    {success && <p role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"><CheckCircle2 size={18} className="shrink-0" />{success}</p>}
    {file && preview && <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h4 className="font-bold text-slate-900">File checked</h4><p className="mt-1 break-all text-sm text-slate-600">{file.name}</p></div><button type="button" aria-label="Remove selected CSV" onClick={() => void selectFile()} className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-white"><X size={18} /></button></div>
      <div className="mt-3 rounded-lg bg-white p-3"><div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium text-slate-600">Total records to process</span><strong className="text-slate-900">{preview.total.toLocaleString()}</strong></div>{preview.tables.length > 1 && <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2">{preview.tables.map(([table, count]) => <li key={table} className="flex justify-between gap-3 text-xs text-slate-600"><span>{table.replace(/([a-z])([A-Z])/g, "$1 $2")}</span><span>{count.toLocaleString()}</span></li>)}</ul>}</div>
      {!reviewing ? <button type="button" onClick={() => setReviewing(true)} className="mt-3 w-full rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white hover:bg-indigo-700">Review before import</button> : <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="flex items-start gap-2 text-sm leading-5 text-amber-900"><ShieldCheck size={19} className="mt-0.5 shrink-0" /><span><strong>Confirm this import.</strong> {preview.total.toLocaleString()} records will be written to the current database{isFeature ? " across the tables listed above" : ""}. Matching IDs will be overwritten.</span></p><div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={importing} onClick={() => setReviewing(false)} className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 font-semibold text-amber-900 disabled:opacity-50">Go back</button><button type="button" disabled={importing} onClick={() => void importTable()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 font-bold text-white disabled:opacity-50">{importing ? <Loader2 size={17} className="animate-spin" /> : <FileUp size={17} />}{importing ? "Importing records…" : "Import CSV now"}</button></div></div>}
    </div>}
  </section>;
}
