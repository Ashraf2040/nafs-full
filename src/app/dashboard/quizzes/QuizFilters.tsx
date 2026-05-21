"use client";

import { Filter, GraduationCap, Target, Lightbulb } from "lucide-react";

interface QuizFiltersProps {
  subjects: { id: string; name: string }[];
  grades: number[];
  outcomes?: { id: string; outcomeText: string }[];
  indicators?: { id: string; indicatorText: string }[];
  defaultSubject?: string;
  defaultGrade?: number | null;
  defaultOutcome?: string;
  defaultIndicator?: string;
}

export default function QuizFilters({
  subjects,
  grades,
  outcomes = [],
  indicators = [],
  defaultSubject,
  defaultGrade,
  defaultOutcome,
  defaultIndicator,
}: QuizFiltersProps) {
  const handleFilterChange = (key: string, value: string) => {
    const url = new URL(window.location.href);

    if (value === "All" || !value) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }

    /* ─── Cascade resets ─── */
    if (key === "subject" || key === "grade") {
      url.searchParams.delete("outcome");
      url.searchParams.delete("indicator");
    }
    if (key === "outcome") {
      url.searchParams.delete("indicator");
    }

    /* Reset to page 1 whenever any filter changes */
    url.searchParams.delete("page");
    window.location.href = url.toString();
  };

  return (
    <>
      {/* Subject */}
      <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
        <Filter size={16} className="text-indigo-500" />
        <select
          className="bg-transparent outline-none text-sm font-bold text-slate-700 cursor-pointer"
          onChange={(e) => handleFilterChange("subject", e.target.value)}
          defaultValue={defaultSubject || "All"}
        >
          <option value="All">All Subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Grade */}
      <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
        <GraduationCap size={16} className="text-indigo-500" />
        <select
          className="bg-transparent outline-none text-sm font-bold text-slate-700 cursor-pointer"
          onChange={(e) => handleFilterChange("grade", e.target.value)}
          defaultValue={defaultGrade?.toString() || "All"}
        >
          <option value="All">All Grades</option>
          {grades.map((g) => (
            <option key={g} value={g}>
              Grade {g}
            </option>
          ))}
        </select>
      </div>

      {/* Outcome */}
      {outcomes.length > 0 && (
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
          <Target size={16} className="text-emerald-500" />
          <select
            className="bg-transparent outline-none text-sm font-bold text-slate-700 cursor-pointer max-w-[180px]"
            onChange={(e) => handleFilterChange("outcome", e.target.value)}
            defaultValue={defaultOutcome || "All"}
          >
            <option value="All">All Outcomes</option>
            {outcomes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.outcomeText.length > 40
                  ? o.outcomeText.substring(0, 40) + "..."
                  : o.outcomeText}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Indicator */}
      {indicators.length > 0 && (
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
          <Lightbulb size={16} className="text-amber-500" />
          <select
            className="bg-transparent outline-none text-sm font-bold text-slate-700 cursor-pointer max-w-[180px]"
            onChange={(e) => handleFilterChange("indicator", e.target.value)}
            defaultValue={defaultIndicator || "All"}
          >
            <option value="All">All Indicators</option>
            {indicators.map((i) => (
              <option key={i.id} value={i.id}>
                {i.indicatorText.length > 40
                  ? i.indicatorText.substring(0, 40) + "..."
                  : i.indicatorText}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}