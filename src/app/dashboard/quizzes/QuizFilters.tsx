"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { Filter, GraduationCap, Target, Lightbulb, X, Search } from "lucide-react";

interface QuizFiltersProps {
  subjects: { id: string; name: string }[];
  grades: number[];
  outcomes?: { id: string; outcomeText: string; indicatorText?: string }[];
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
  const router = useRouter();
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [showIndicatorModal, setShowIndicatorModal] = useState(false);
  const [outcomeSearch, setOutcomeSearch] = useState("");
  const [indicatorSearch, setIndicatorSearch] = useState("");

  const selectedOutcome = outcomes.find(o => o.id === defaultOutcome);
  const selectedIndicator = indicators.find(i => i.id === defaultIndicator);

  const handleFilterChange = (key: string, value: string) => {
    const url = new URL(window.location.href);
    if (value === "All" || !value) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
    if (key === "subject" || key === "grade") {
      url.searchParams.delete("outcome");
      url.searchParams.delete("indicator");
    }
    if (key === "outcome") {
      url.searchParams.delete("indicator");
    }
    url.searchParams.delete("page");
    startTransition(() => { router.push(url.toString()); });
  };

  const filteredOutcomes = outcomes.filter(o =>
    !outcomeSearch || o.outcomeText.toLowerCase().includes(outcomeSearch.toLowerCase()) ||
    (o.indicatorText && o.indicatorText.toLowerCase().includes(outcomeSearch.toLowerCase()))
  );

  const normalizedIndicatorSearch = indicatorSearch.trim().toLowerCase();
  const filteredIndicators = indicators.filter((indicator) =>
    !normalizedIndicatorSearch ||
    indicator.indicatorText.toLowerCase().includes(normalizedIndicatorSearch)
  );

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
      <div className="flex h-11 min-w-[160px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 transition-colors focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
        <Filter size={16} className="shrink-0 text-indigo-500" />
        <select
          aria-label="Filter quizzes by subject"
          className="min-w-0 flex-1 cursor-pointer bg-transparent text-sm font-semibold text-slate-700 outline-none"
          onChange={(e) => handleFilterChange("subject", e.target.value)}
          defaultValue={defaultSubject || "All"}
        >
          <option value="All">All Subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="flex h-11 min-w-[145px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 transition-colors focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
        <GraduationCap size={16} className="shrink-0 text-indigo-500" />
        <select
          aria-label="Filter quizzes by grade"
          className="min-w-0 flex-1 cursor-pointer bg-transparent text-sm font-semibold text-slate-700 outline-none"
          onChange={(e) => handleFilterChange("grade", e.target.value)}
          defaultValue={defaultGrade?.toString() || "All"}
        >
          <option value="All">All Grades</option>
          {grades.map((g) => (
            <option key={g} value={g}>Grade {g}</option>
          ))}
        </select>
      </div>

      {outcomes.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowOutcomeModal(true)}
            className="flex h-11 min-w-[180px] max-w-[260px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm font-semibold text-slate-700 outline-none transition-all hover:border-indigo-300 hover:bg-white focus:ring-2 focus:ring-indigo-200"
          >
            <Target size={16} className="shrink-0 text-emerald-500" />
            <span className="truncate">
              {selectedOutcome ? selectedOutcome.outcomeText : "All Outcomes"}
            </span>
          </button>

          {showOutcomeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowOutcomeModal(false)}>
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <Target size={20} className="text-emerald-500" /> Select Learning Outcome
                  </h3>
                  <button type="button" aria-label="Close outcome picker" onClick={() => setShowOutcomeModal(false)} className="p-2 rounded-xl hover:bg-slate-200 transition-colors">
                    <X size={18} className="text-slate-500" />
                  </button>
                </div>

                <div className="px-6 py-3 border-b border-slate-100">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search outcomes..."
                      value={outcomeSearch}
                      onChange={e => setOutcomeSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => { handleFilterChange("outcome", ""); setShowOutcomeModal(false); setOutcomeSearch(""); }}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all hover:shadow-md ${!defaultOutcome ? "border-indigo-500 bg-indigo-50 ring-4 ring-indigo-50" : "border-slate-100 hover:border-indigo-300 bg-white"}`}
                  >
                    <span className="font-semibold text-slate-700">All Outcomes</span>
                  </button>
                  {filteredOutcomes.map(o => (
                    <button
                      type="button"
                      key={o.id}
                      onClick={() => { handleFilterChange("outcome", o.id); setShowOutcomeModal(false); setOutcomeSearch(""); }}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all hover:shadow-md ${defaultOutcome === o.id ? "border-indigo-500 bg-indigo-50 ring-4 ring-indigo-50" : "border-slate-100 hover:border-indigo-300 bg-white"}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mt-0.5 shrink-0">
                          Outcome
                        </div>
                        <div>
                          <p className="text-slate-800 font-bold text-sm leading-relaxed">{o.outcomeText}</p>
                          {o.indicatorText && (
                            <p className="text-slate-500 text-xs mt-1.5 line-clamp-2">{o.indicatorText}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {indicators.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowIndicatorModal(true)}
            className="flex h-11 min-w-[180px] max-w-[260px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm font-semibold text-slate-700 outline-none transition-all hover:border-indigo-300 hover:bg-white focus:ring-2 focus:ring-indigo-200"
          >
            <Lightbulb size={16} className="shrink-0 text-amber-500" />
            <span className="truncate">
              {selectedIndicator ? selectedIndicator.indicatorText : "All Indicators"}
            </span>
          </button>

          {showIndicatorModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
              onClick={() => setShowIndicatorModal(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="indicator-picker-title"
                className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
                  <h3 id="indicator-picker-title" className="flex items-center gap-2 text-lg font-bold text-slate-800">
                    <Lightbulb size={20} className="text-amber-500" /> Select Indicator
                  </h3>
                  <button
                    type="button"
                    aria-label="Close indicator picker"
                    onClick={() => setShowIndicatorModal(false)}
                    className="rounded-xl p-2 transition-colors hover:bg-slate-200"
                  >
                    <X size={18} className="text-slate-500" />
                  </button>
                </div>

                <div className="border-b border-slate-100 px-6 py-3">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      autoFocus
                      placeholder="Search indicators..."
                      value={indicatorSearch}
                      onChange={(event) => setIndicatorSearch(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <p className="mt-2 text-xs font-medium text-slate-400">
                    {filteredIndicators.length} of {indicators.length} indicators
                  </p>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto p-4">
                  <button
                    type="button"
                    onClick={() => {
                      handleFilterChange("indicator", "");
                      setShowIndicatorModal(false);
                      setIndicatorSearch("");
                    }}
                    className={`w-full rounded-2xl border-2 p-4 text-left transition-all hover:shadow-md ${!defaultIndicator ? "border-indigo-500 bg-indigo-50 ring-4 ring-indigo-50" : "border-slate-100 bg-white hover:border-indigo-300"}`}
                  >
                    <span className="font-semibold text-slate-700">All Indicators</span>
                  </button>

                  {filteredIndicators.map((indicator) => (
                    <button
                      type="button"
                      key={indicator.id}
                      onClick={() => {
                        handleFilterChange("indicator", indicator.id);
                        setShowIndicatorModal(false);
                        setIndicatorSearch("");
                      }}
                      className={`w-full rounded-2xl border-2 p-4 text-left transition-all hover:shadow-md ${defaultIndicator === indicator.id ? "border-indigo-500 bg-indigo-50 ring-4 ring-indigo-50" : "border-slate-100 bg-white hover:border-indigo-300"}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 shrink-0 rounded-lg bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                          Indicator
                        </span>
                        <p className="text-sm font-semibold leading-relaxed text-slate-800">
                          {indicator.indicatorText}
                        </p>
                      </div>
                    </button>
                  ))}

                  {filteredIndicators.length === 0 && (
                    <div className="py-12 text-center">
                      <Search size={28} className="mx-auto mb-3 text-slate-300" />
                      <p className="font-semibold text-slate-600">No indicators found</p>
                      <p className="mt-1 text-sm text-slate-400">Try a different search term.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
