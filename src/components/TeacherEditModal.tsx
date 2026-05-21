"use client";
import { useState } from "react";
import { X, Save, Loader2, BookOpen } from "lucide-react";

interface Subject { id: string; name: string }
interface Grade { id: string; level: number }
interface Assignment { subjectId: string; gradeIds: string[] }

interface Props {
  teacher: any;
  subjects: Subject[];
  grades: Grade[];
  onClose: () => void;
  onSaved: () => void;
}

export default function TeacherEditModal({ teacher, subjects, grades, onClose, onSaved }: Props) {
  // Seed from current teacher.assignments
  const seed: Assignment[] = (teacher.assignments || []).reduce((acc: Assignment[], a: any) => {
    const found = acc.find((x) => x.subjectId === a.subjectId);
    if (found) {
      if (!found.gradeIds.includes(a.gradeId)) found.gradeIds.push(a.gradeId);
    } else {
      acc.push({ subjectId: a.subjectId, gradeIds: [a.gradeId] });
    }
    return acc;
  }, []);

  const [assignments, setAssignments] = useState<Assignment[]>(seed);   // FIXED
  const [loading, setLoading] = useState(false);

  const toggleSubject = (subjectId: string) => {
    setAssignments((prev) => {
      const exists = prev.find((a) => a.subjectId === subjectId);
      if (exists) return prev.filter((a) => a.subjectId !== subjectId);
      return [...prev, { subjectId, gradeIds: [] }];
    });
  };

  const toggleGrade = (subjectId: string, gradeId: string) => {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.subjectId !== subjectId) return a;
        const gradeIds = a.gradeIds.includes(gradeId)
          ? a.gradeIds.filter((g) => g !== gradeId)
          : [...a.gradeIds, gradeId].sort();
        return { ...a, gradeIds };
      })
    );
  };

  const handleSave = async () => {
    if (assignments.some((a) => a.gradeIds.length === 0)) {
      alert("Select at least one grade for each chosen subject.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/teachers/${teacher.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      });
      if (res.ok) {
        onSaved();
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || "Update failed");
      }
    } catch {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">
            Edit Assignments: {teacher.name}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X size={24} />
          </button>
        </div>

        <div className="mb-6">
          <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
            <BookOpen size={18} /> Subjects & Grades
          </h3>
          <div className="space-y-3">
            {subjects.map((sub) => {
              const assigned = assignments.find((a) => a.subjectId === sub.id);
              return (
                <div
                  key={sub.id}
                  className={`border-2 rounded-xl p-4 transition-all ${
                    assigned ? "border-indigo-200 bg-indigo-50/50" : "border-slate-100"
                  }`}
                >
                  <label className="flex items-center gap-3 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={!!assigned}
                      onChange={() => toggleSubject(sub.id)}
                      className="w-5 h-5 text-indigo-600 rounded"
                    />
                    <span className="font-bold text-slate-800">{sub.name}</span>
                  </label>

                  {assigned && (
                    <div className="flex flex-wrap gap-2 pl-8">
                      {grades.map((g) => (
                        <button
                          key={g.id}
                          onClick={() => toggleGrade(sub.id, g.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            assigned.gradeIds.includes(g.id)
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                          }`}
                        >
                          Grade {g.level}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          Save Assignments
        </button>
      </div>
    </div>
  );
}