"use client";
import { useState, useEffect } from "react";
import { X, Save, Loader2, GraduationCap, School } from "lucide-react";

interface Student {
  id: string;
  name: string;
  gradeLevel: number | null;
  gradeId: string | null;
  classId: string | null;
  className: string | null;
}

interface ClassItem {
  id: string;
  name: string;
  gradeId: string;
  grade: { level: number };
}

interface Props {
  student: Student;
  onClose: () => void;
  onSaved: () => void;
}

export default function StudentEditModal({ student, onClose, onSaved }: Props) {
  const [gradeLevel, setGradeLevel] = useState(student.gradeLevel?.toString() || "6");
  const [classId, setClassId] = useState(student.classId || "");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFetchingClasses, setIsFetchingClasses] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!gradeLevel) return;
      setIsFetchingClasses(true);
      try {
        const res = await fetch(`/api/classes?gradeLevel=${gradeLevel}`);
        if (res.ok) {
          const data = await res.json();
          setClasses(data);
        }
      } catch (error) {
        console.error("Failed to fetch classes:", error);
      } finally {
        setIsFetchingClasses(false);
      }
    };
    fetchClasses();
  }, [gradeLevel]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gradeLevel: parseInt(gradeLevel),
          classId: classId || null,
        }),
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
      <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">Edit Student</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Grade
            </label>
            <select
              value={gradeLevel}
              onChange={(e) => {
                setGradeLevel(e.target.value);
                setClassId("");
              }}
              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-400 outline-none font-medium text-slate-700 bg-white"
            >
              {[3, 4, 5, 6, 7, 8, 9].map((g) => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Class
            </label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-400 outline-none font-medium text-slate-700 bg-white"
            >
              <option value="">No class assigned</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {isFetchingClasses && (
              <p className="text-xs text-slate-400 mt-1">Loading classes...</p>
            )}
            {classes.length === 0 && !isFetchingClasses && (
              <p className="text-xs text-amber-600 mt-1">
                No classes available. Add a class first.
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Save Changes
        </button>
      </div>
    </div>
  );
}