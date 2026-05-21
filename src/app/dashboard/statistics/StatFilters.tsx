"use client";

import { Filter, GraduationCap } from "lucide-react";

interface StatFiltersProps {
  subjects: { id: string; name: string }[];
  grades: number[];
  defaultSubject?: string;
  defaultGrade?: number | null;
}

export default function StatFilters({ subjects, grades, defaultSubject, defaultGrade }: StatFiltersProps) {
  const updateFilter = (key: string, value: string) => {
    const url = new URL(window.location.href);
    if (value === "All") url.searchParams.delete(key);
    else url.searchParams.set(key, value);
    window.location.href = url.toString();
  };

  return (
    <div className="flex gap-3 flex-wrap">
      <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
        <Filter size={16} className="text-indigo-500" />
        <select
          className="bg-transparent outline-none text-sm font-bold text-slate-700 cursor-pointer"
          onChange={(e) => updateFilter("subject", e.target.value)}
          defaultValue={defaultSubject || "All"}
        >
          <option value="All">All Subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
        <GraduationCap size={16} className="text-indigo-500" />
        <select
          className="bg-transparent outline-none text-sm font-bold text-slate-700 cursor-pointer"
          onChange={(e) => updateFilter("grade", e.target.value)}
          defaultValue={defaultGrade?.toString() || "All"}
        >
          <option value="All">All Grades</option>
          {grades.map((g) => (
            <option key={g} value={g}>Grade {g}</option>
          ))}
        </select>
      </div>
    </div>
  );
}