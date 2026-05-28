// src/components/QuizManager.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import {
  Wand2, Calculator, X, Plus, Save, Upload, FileText,
  Trash2, Loader2, Check, Table, Target, AlertCircle,
  Image as ImageIcon, RefreshCw,
} from "lucide-react";
import { MathRenderer } from "./MathRenderer";
import SafeQuizImage from "./SafeQuizImage";

interface TeacherAssignmentRaw {
  subject: { id: string; name: string };
  grade: { id: string; level: number };
}

interface GroupedAssignment {
  subject: { id: string; name: string };
  grades: number[];
}

export default function QuizManager2() {
  const { data: session, status: sessionStatus } = useSession();
  const userRole = (session?.user as any)?.role;

  if (userRole === "STUDENT") return null;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [isFetchingOutcomes, setIsFetchingOutcomes] = useState(false);
  const [teacherAssignments, setTeacherAssignments] = useState<GroupedAssignment[]>([]);
  const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);

  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [lessonText, setLessonText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [outcomes, setOutcomes] = useState<any[]>([]);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState("");

  const [mathMode, setMathMode] = useState(false);
  const [mathInput, setMathInput] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);

  const [includeImages, setIncludeImages] = useState(false);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  // ─── 1. Load assignments & initialize defaults ───
  useEffect(() => {
    if (sessionStatus === "loading" || !userRole) {
      console.log("[QuizManager] Waiting for session...", { sessionStatus, userRole });
      return;
    }

    if (userRole === "STUDENT") {
      setAssignmentsLoaded(true);
      return;
    }

    if (userRole !== "TEACHER") {
      console.log("[QuizManager] Admin init");
      setAssignmentsLoaded(true);
      setSubject((prev) => prev || "Science");
      setGrade((prev) => prev || "3");
      return;
    }

    console.log("[QuizManager] Fetching teacher assignments...");
    fetch("/api/teachers/me/assignments")
      .then(async (r) => {
        const contentType = r.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          const text = await r.text();
          throw new Error(`Server returned ${r.status} (non-JSON: ${text.slice(0, 100)})`);
        }
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
        const raw: TeacherAssignmentRaw[] = data.assignments || [];
        const grouped = raw.reduce((acc: GroupedAssignment[], curr) => {
          const existing = acc.find((a) => a.subject.id === curr.subject.id);
          if (existing) {
            if (!existing.grades.includes(curr.grade.level)) {
              existing.grades.push(curr.grade.level);
            }
          } else {
            acc.push({ subject: curr.subject, grades: [curr.grade.level] });
          }
          return acc;
        }, []);
        grouped.forEach((g) => g.grades.sort((a, b) => a - b));

        setTeacherAssignments(grouped);
        setAssignmentsLoaded(true);

        if (grouped.length > 0) {
          setSubject(grouped[0].subject.name);
          setGrade(String(grouped[0].grades[0]));
        }
      })
      .catch((err) => {
        console.error("[QuizManager] Failed to load assignments:", err);
        toast.error(`Failed to load teacher assignments: ${err.message}`);
        setAssignmentsLoaded(true);
      });
  }, [sessionStatus, userRole]);
  const hasFetchedOnOpen = useRef(false);
  // ─── 2. Fetch outcomes when subject/grade ready ───
  useEffect(() => {
    console.log("[QuizManager] Outcomes effect check:", {
      subject, grade, assignmentsLoaded, userRole,
      teacherAssignmentsCount: teacherAssignments.length,
    });

    if (!subject || !grade || !assignmentsLoaded) {
      console.log("[QuizManager] Outcomes skipped: missing subject/grade or not loaded");
      return;
    }

    if (userRole === "TEACHER") {
      const hasAccess = teacherAssignments.some(
        (a) => a.subject.name === subject && a.grades.includes(parseInt(grade))
      );
      if (!hasAccess) {
        console.log("[QuizManager] Teacher lacks access to", subject, grade);
        setOutcomes([]);
        setSelectedOutcomeId("");
        toast.error(`You are not assigned to ${subject} Grade ${grade}`);
        return;
      }
    }

    const fetchOutcomes = async () => {
      setIsFetchingOutcomes(true);
      try {
        const url = `/api/outcomes?subject=${encodeURIComponent(subject)}&grade=${grade}`;
        console.log("[QuizManager] Fetching outcomes:", url);
        const res = await fetch(url);

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          const text = await res.text();
          throw new Error(`Expected JSON but got ${res.status}: ${text.slice(0, 200)}`);
        }

        if (res.status === 403) {
          toast.error("Access denied: Not your assigned subject/grade");
          setOutcomes([]);
          setSelectedOutcomeId("");
          return;
        }
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        console.log("[QuizManager] Outcomes received:", data.outcomes?.length || 0);
        setOutcomes(data.outcomes || []);
        setSelectedOutcomeId("");
      } catch (err: any) {
        console.error("[QuizManager] Outcomes fetch error:", err);
        toast.error(`Failed to fetch outcomes: ${err.message}`);
        setOutcomes([]);
      } finally {
        setIsFetchingOutcomes(false);
      }
    };

    fetchOutcomes();
  }, [subject, grade, userRole, teacherAssignments, assignmentsLoaded]);

  // ─── 3. Retry fetch when outcomes modal opens (safety net) ───
  useEffect(() => {
    if (isOutcomeModalOpen && !hasFetchedOnOpen.current && subject && grade) {
      hasFetchedOnOpen.current = true;

      // Only fetch if outcomes are empty and not already fetching
      if (outcomes.length === 0 && !isFetchingOutcomes) {
        console.log("[QuizManager] Modal opened, fetching outcomes...");
        setIsFetchingOutcomes(true);
        fetch(`/api/outcomes?subject=${encodeURIComponent(subject)}&grade=${grade}`)
          .then(async (res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            console.log("[QuizManager] Modal fetch received:", data.outcomes?.length || 0);
            setOutcomes(data.outcomes || []);
          })
          .catch((err) => {
            console.error("[QuizManager] Modal fetch failed:", err);
          })
          .finally(() => setIsFetchingOutcomes(false));
      }
    }

    if (!isOutcomeModalOpen) {
      hasFetchedOnOpen.current = false;
    }
  }, [isOutcomeModalOpen, subject, grade]);

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingExcel(true);
    const formData = new FormData();
    formData.append("file", file);

    const toastId = toast.loading("Uploading curriculum outcomes...");

    try {
      const res = await fetch("/api/outcomes/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Successfully uploaded ${data.count} curriculum outcomes!`, { id: toastId });
        const outcomesRes = await fetch(`/api/outcomes?subject=${encodeURIComponent(subject)}&grade=${grade}`);
        if (outcomesRes.ok) {
          const outcomesData = await outcomesRes.json();
          setOutcomes(outcomesData.outcomes || []);
        }
      } else {
        const err = await res.json();
        toast.error(`Upload failed: ${err.message || "Unknown error"}`, { id: toastId });
      }
    } catch {
      toast.error("Failed to upload Excel sheet. Please try again.", { id: toastId });
    } finally {
      setIsUploadingExcel(false);
      e.target.value = "";
    }
  };

  const handleAIGeneration = async () => {
    setIsGenerating(true);
    const toastId = toast.loading("Generating questions with AI...");

    try {
      let pdfBase64 = "";
      if (pdfFile) pdfBase64 = await fileToBase64(pdfFile);

      const selectedOutcome = outcomes.find((o) => o.id === selectedOutcomeId);

      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonText,
          pdfBase64,
          grade,
          subject,
          outcome: selectedOutcome?.outcomeText || "",
          indicator: selectedOutcome?.indicatorText || "",
          questionCount: 10,
          includeImages,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        const isCapacityError =
          res.status === 503 ||
          err.error?.includes("capacity") ||
          err.error?.includes("high demand") ||
          err.error?.includes("try again");

        if (isCapacityError) {
          throw new Error(
            "🤖 AI is experiencing high demand. Please wait a moment and click Generate again."
          );
        }
        throw new Error(err.error || "Generation failed");
      }

      const data = await res.json();
      if (data.questions && Array.isArray(data.questions)) {
        setQuestions((prev) => [...prev, ...data.questions]);
        setLessonText("");
        setPdfFile(null);
        toast.success(
          `${data.questions.length} questions generated successfully!`,
          { id: toastId }
        );
      } else {
        throw new Error("Received empty question list from AI.");
      }
    } catch (error: any) {
      toast.error(error.message || "AI Generation failed. Please try again.", {
        id: toastId,
        duration: 6000,
      });
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAssessment = async () => {
    if (questions.length === 0) {
      toast.error("Please add at least one question.");
      return;
    }
    if (!dueDate) {
      toast.error("Please select a due date.");
      return;
    }

    if (userRole === "TEACHER") {
      const hasAccess = teacherAssignments.some(
        (a) => a.subject.name === subject && a.grades.includes(parseInt(grade))
      );
      if (!hasAccess) {
        toast.error("You are not assigned to this subject/grade");
        return;
      }
    }

    setIsSaving(true);
    const toastId = toast.loading("Saving assessment to database...");

    try {
      const selectedOutcome = outcomes.find((o) => o.id === selectedOutcomeId);

      const payload = {
        title: "",
        subjectName: subject,
        gradeTarget: parseInt(grade),
        dueDate: new Date(dueDate).toISOString(),
        questions,
        isPublished: false,
        description: `Assessment for Grade ${grade} ${subject}`,
        outcomeText: selectedOutcome?.outcomeText || "",
      };

      const res = await fetch("/api/quizzes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Assessment saved successfully!", { id: toastId });
        setIsModalOpen(false);
        setQuestions([]);
        setLessonText("");
        setPdfFile(null);
        setSelectedOutcomeId("");
        setDueDate("");
        setIncludeImages(false);
        window.location.reload();
      } else {
        const err = await res.json();
        toast.error(`Error: ${err.message || "Failed to save"}`, { id: toastId });
      }
    } catch {
      toast.error("Failed to save quiz. Please try again.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const addManualQuestion = () => {
    setQuestions([
      ...questions,
      { question: "", options: ["", "", "", ""], answer: "", explanation: "" },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
    toast.success("Question removed.");
  };

  const updateQuestionField = (index: number, field: string, value: string) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = value;
    setQuestions(updated);
  };

  const handleQuestionImageUpload = async (
    qIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      const dataUrl = `data:${file.type};base64,${base64}`;
      updateQuestionField(qIndex, "image_url", dataUrl);
      toast.success("Image added to question.");
    } catch {
      toast.error("Failed to upload image. Please try again.");
    }
  };

  const removeQuestionImage = (qIndex: number) => {
    const updated = [...questions];
    delete updated[qIndex].image_url;
    setQuestions(updated);
    toast.success("Image removed.");
  };

  const availableSubjects =
    userRole === "ADMIN"
      ? [
        { id: "science", name: "Science" },
        { id: "english", name: "English" },
        { id: "math", name: "Math" },
      ]
      : teacherAssignments.map((a) => a.subject);

  const availableGrades =
    userRole === "ADMIN"
      ? [3, 6, 9]
      : teacherAssignments.find((a) => a.subject.name === subject)?.grades || [];

  if (userRole === "TEACHER" && !assignmentsLoaded) {
    return (
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Assessment Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">Loading your assignments...</p>
        </div>
        <Loader2 size={24} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Assessment Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">
            Create and manage NAFS assessments for your students
          </p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleExcelUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploadingExcel}
            />
            <button className="bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 px-6 py-2.5 rounded-xl font-medium shadow-sm transition-all flex items-center gap-2">
              {isUploadingExcel ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Table size={20} />
              )}
              {isUploadingExcel ? "Uploading..." : "Import Outcomes"}
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-md transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus size={20} /> Create New Quiz
          </button>
        </div>
      </div>

      {/* Outcomes Selection Modal */}
      {isOutcomeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-4xl h-[80vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
            <header className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Target className="text-indigo-600" /> Select Learning Outcome
                </h3>
                <p className="text-slate-500 text-sm mt-1">
                  Grade {grade} • {subject}
                </p>
              </div>
              <button
                onClick={() => setIsOutcomeModalOpen(false)}
                className="p-2 bg-white rounded-full hover:bg-slate-200 text-slate-500 shadow-sm transition-colors"
              >
                <X size={24} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-slate-50/50">
              {isFetchingOutcomes ? (
                <div className="text-center py-20">
                  <Loader2 size={48} className="mx-auto text-indigo-400 mb-4 animate-spin" />
                  <p className="text-slate-500">Loading outcomes...</p>
                </div>
              ) : outcomes.length === 0 ? (
                <div className="text-center py-20">
                  <Target size={48} className="mx-auto text-slate-300 mb-4" />
                  <h4 className="text-lg font-bold text-slate-600">No Outcomes Found</h4>
                  <p className="text-slate-400 mt-2 max-w-md mx-auto">
                    No curriculum outcomes exist for <strong>Grade {grade} {subject}</strong>.
                    Please upload the curriculum Excel sheet first.
                  </p>
                  <button
                    onClick={() => {
                      setIsFetchingOutcomes(true);
                      fetch(`/api/outcomes?subject=${encodeURIComponent(subject)}&grade=${grade}`)
                        .then(async (r) => {
                          if (!r.ok) throw new Error(`HTTP ${r.status}`);
                          const data = await r.json();
                          setOutcomes(data.outcomes || []);
                        })
                        .catch((err) => {
                          toast.error(`Refresh failed: ${err.message}`);
                        })
                        .finally(() => setIsFetchingOutcomes(false));
                    }}
                    className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-semibold hover:bg-indigo-100 transition-colors"
                  >
                    <RefreshCw size={16} /> Retry Fetch
                  </button>
                </div>
              ) : (
                outcomes.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => {
                      setSelectedOutcomeId(o.id);
                      setIsOutcomeModalOpen(false);
                      toast.success("Learning outcome selected.");
                    }}
                    className={`bg-white p-6 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-lg ${selectedOutcomeId === o.id
                        ? "border-indigo-500 shadow-md ring-4 ring-indigo-50"
                        : "border-slate-100 hover:border-indigo-300"
                      }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest mt-1 shrink-0">
                        Outcome
                      </div>
                      <p className="text-slate-800 font-bold leading-relaxed">
                        {o.outcomeText}
                      </p>
                    </div>
                    <div className="flex items-start gap-4 mt-4 pt-4 border-t border-slate-50">
                      <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest mt-1 shrink-0">
                        Indicator
                      </div>
                      <p className="text-slate-600 font-medium leading-relaxed">
                        {o.indicatorText}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Quiz Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-7xl h-[90vh] rounded-[2rem] shadow-2xl flex flex-col relative overflow-hidden">
            <header className="px-8 py-6 border-b border-slate-100 bg-slate-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-slate-800">Quiz Creator Studio</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 bg-white rounded-full hover:bg-slate-200 text-slate-500 transition-colors shadow-sm"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex gap-4 flex-wrap items-center">
                <select
                  value={subject}
                  onChange={(e) => {
                    const newSubject = e.target.value;
                    setSubject(newSubject);
                    setSelectedOutcomeId("");
                    if (userRole === "TEACHER") {
                      const firstGrade =
                        teacherAssignments.find((a) => a.subject.name === newSubject)
                          ?.grades[0] || "";
                      setGrade(String(firstGrade));
                    }
                  }}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 font-medium text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {availableSubjects.length === 0 && (
                    <option value="">No subjects assigned</option>
                  )}
                  {availableSubjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <select
                  value={grade}
                  onChange={(e) => {
                    setGrade(e.target.value);
                    setSelectedOutcomeId("");
                  }}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 font-medium text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {availableGrades.length === 0 && (
                    <option value="">No grades available</option>
                  )}
                  {availableGrades.map((g) => (
                    <option key={g} value={g}>
                      Grade {g}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2 bg-white px-3 border border-slate-200 rounded-xl shadow-sm">
                  <span className="text-xs font-bold text-slate-400 uppercase">Due:</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="p-1 outline-none font-medium text-slate-600"
                  />
                </div>

                <label className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
                  <ImageIcon
                    size={16}
                    className={includeImages ? "text-indigo-600" : "text-slate-400"}
                  />
                  <span className="text-sm font-bold text-slate-700">AI Images</span>
                  <input
                    type="checkbox"
                    checked={includeImages}
                    onChange={(e) => setIncludeImages(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                  />
                </label>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100">
                  <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                    <Wand2 size={20} className="text-indigo-600" /> Auto-Generate
                  </h4>

                  <div className="mb-4">
                    <label className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2 block">
                      Target Outcome & Indicator
                    </label>
                    <button
                      onClick={() => setIsOutcomeModalOpen(true)}
                      disabled={isFetchingOutcomes || !subject || !grade}
                      className="w-full bg-white border border-indigo-200 rounded-xl p-4 text-left shadow-sm hover:border-indigo-400 transition-colors flex justify-between items-center group disabled:opacity-50"
                    >
                      {isFetchingOutcomes ? (
                        <span className="flex items-center gap-2 text-indigo-400 font-medium">
                          <Loader2 size={16} className="animate-spin" /> Loading curriculum...
                        </span>
                      ) : selectedOutcomeId ? (
                        <div className="pr-4">
                          <span className="text-xs font-black text-indigo-500 block mb-1">
                            SELECTED OUTCOME
                          </span>
                          <span className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug">
                            {outcomes.find((o) => o.id === selectedOutcomeId)?.outcomeText}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-slate-400">
                          {subject && grade
                            ? "Click to browse curriculum..."
                            : "Select subject and grade first"}
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="mb-4 relative">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div
                      className={`p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-sm transition-colors ${pdfFile
                          ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                          : "border-indigo-200 bg-white text-indigo-400 hover:bg-indigo-100/50"
                        }`}
                    >
                      {pdfFile ? (
                        <FileText size={24} className="mb-1" />
                      ) : (
                        <Upload size={24} className="mb-1" />
                      )}
                      <span className="font-medium text-center">
                        {pdfFile ? pdfFile.name : "Upload Lesson PDF"}
                      </span>
                    </div>
                  </div>

                  <div className="text-center text-xs text-indigo-400 font-bold mb-4">
                    - OR PASTE TEXT -
                  </div>

                  <textarea
                    value={lessonText}
                    onChange={(e) => setLessonText(e.target.value)}
                    className="w-full h-24 p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none text-sm resize-none mb-4 shadow-inner"
                    placeholder="Paste textbook paragraph or notes..."
                  />
                  <button
                    onClick={handleAIGeneration}
                    disabled={
                      isGenerating ||
                      (!lessonText && !pdfFile && !selectedOutcomeId) ||
                      isFetchingOutcomes ||
                      !subject ||
                      !grade
                    }
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white py-2.5 rounded-xl font-medium transition-colors flex justify-center items-center gap-2 shadow-md"
                  >
                    {isGenerating ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Wand2 size={20} />
                    )}
                    {isGenerating ? "Generating 10 Qs..." : "Generate 10 Questions"}
                  </button>

                  {includeImages && (
                    <p className="text-xs text-indigo-500 mt-2 text-center font-medium">
                      <ImageIcon size={12} className="inline mr-1" />
                      AI will generate images for visual questions
                    </p>
                  )}
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <Calculator size={20} className="text-slate-600" /> Math Mode
                    </h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={mathMode}
                        onChange={() => setMathMode(!mathMode)}
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  {mathMode && (
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={mathInput}
                        onChange={(e) => setMathInput(e.target.value)}
                        placeholder="Type LaTeX (e.g., \frac{1}{2}x^2)"
                        className="w-full p-3 border rounded-xl font-mono text-sm shadow-inner"
                      />
                      <div className="p-4 bg-white border rounded-xl min-h-[60px] flex items-center justify-center text-xl shadow-sm overflow-x-auto">
                        {mathInput ? (
                          <MathRenderer math={mathInput} block={true} />
                        ) : (
                          <span className="text-slate-400 text-sm">Preview will appear here</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-8 space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="font-bold text-slate-800 text-xl">Quiz Questions</h4>
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-bold">
                    {questions.length} Qs
                  </span>
                </div>

                {questions.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                    <p>Use the AI generator or add questions manually.</p>
                  </div>
                ) : (
                  questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group"
                    >
                      <button
                        onClick={() => removeQuestion(idx)}
                        className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 size={18} />
                      </button>

                      <div className="mb-4 pr-10">
                        <label className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1 block">
                          Question {idx + 1}
                        </label>
                        <textarea
                          value={q.question}
                          onChange={(e) => updateQuestionField(idx, "question", e.target.value)}
                          className="w-full p-2 border-b border-transparent hover:border-slate-200 focus:border-indigo-400 outline-none font-bold text-slate-800 resize-none overflow-hidden"
                          rows={2}
                          placeholder="Type your question here..."
                        />
                      </div>

                      {q.image_url ? (
                        <div className="mb-4 relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                          <SafeQuizImage
                            imageUrl={q.image_url}
                            svgBackup={q.image_svg_backup}
                            templateBackup={q.image_template_backup}
                            alt={q.image_prompt || `Question ${idx + 1} illustration`}
                          />
                          <button
                            onClick={() => removeQuestionImage(idx)}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-md z-10"
                            title="Remove image"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="mb-4">
                          <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer group">
                            <ImageIcon size={18} className="text-slate-400 group-hover:text-indigo-500" />
                            <span className="text-sm font-medium text-slate-500 group-hover:text-indigo-600">
                              Add image to question
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleQuestionImageUpload(idx, e)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {q.options.map((opt: string, oIdx: number) => (
                          <div key={oIdx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`answer-${idx}`}
                              checked={q.answer === opt && opt !== ""}
                              onChange={() => updateQuestionField(idx, "answer", opt)}
                              className="w-4 h-4 text-indigo-600"
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateOption(idx, oIdx, e.target.value)}
                              placeholder={`Option ${oIdx + 1}`}
                              className={`w-full p-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-indigo-400 ${q.answer === opt && opt !== ""
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-medium"
                                  : "bg-slate-50 border-slate-200"
                                }`}
                            />
                          </div>
                        ))}
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                          Explanation
                        </label>
                        <input
                          type="text"
                          value={q.explanation}
                          onChange={(e) => updateQuestionField(idx, "explanation", e.target.value)}
                          placeholder="Why is this answer correct?"
                          className="w-full p-2 bg-blue-50/50 border border-blue-100 rounded-lg text-sm text-blue-800 outline-none focus:border-blue-400"
                        />
                      </div>
                    </div>
                  ))
                )}

                <button
                  onClick={addManualQuestion}
                  className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 font-bold hover:bg-slate-50 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex justify-center items-center gap-2"
                >
                  <Plus size={20} /> Add Question Manually
                </button>
              </div>
            </div>

            <footer className="px-8 py-4 border-t border-slate-100 bg-white flex justify-end gap-4 mt-auto">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={handleSaveAssessment}
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-md transition-colors flex items-center gap-2"
              >
                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                {isSaving ? "Saving..." : "Save Assessment"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}