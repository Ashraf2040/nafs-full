"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Loader2, Save, Plus, Trash2, X, ArrowLeft, CheckCircle2,
  AlertCircle, Image as ImageIcon
} from "lucide-react";
import Link from "next/link";

interface Question {
  id?: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  imageUrl?: string | null;
}

interface QuizData {
  id: string;
  title: string;
  description: string;
  gradeTarget: number;
  dueDate: string;
  isPublished: boolean;
  subject: { name: string };
  questions: Question[];
}

export default function EditQuizPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const quizId = params.id as string;
  const userRole = (session?.user as any)?.role;

  // Redirect students
  if (userRole === "STUDENT") {
    router.push("/dashboard/quizzes");
    return null;
  }

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await fetch(`/api/quizzes/${quizId}`);
        if (!res.ok) throw new Error("Quiz not found");
        const data = await res.json();

        // Normalize questions to our interface
        const normalizedQuestions: Question[] = (data.questions || []).map((q: any) => ({
          id: q.id,
          questionText: q.questionText || q.question || "",
          options: Array.isArray(q.options) ? q.options : [],
          correctAnswer: q.correctAnswer || q.answer || "",
          explanation: q.explanation || "",
          imageUrl: q.imageUrl || q.image_url || null,
        }));

        setQuiz({
          ...data,
          questions: normalizedQuestions,
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [quizId]);

  const updateQuestionField = (index: number, field: keyof Question, value: any) => {
    if (!quiz) return;
    const updated = [...quiz.questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuiz({ ...quiz, questions: updated });
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    if (!quiz) return;
    const updated = [...quiz.questions];
    const updatedOptions = [...updated[qIndex].options];
    updatedOptions[optIndex] = value;
    updated[qIndex] = { ...updated[qIndex], options: updatedOptions };
    setQuiz({ ...quiz, questions: updated });
  };

  const addQuestion = () => {
    if (!quiz) return;
    setQuiz({
      ...quiz,
      questions: [
        ...quiz.questions,
        {
          questionText: "",
          options: ["", "", "", ""],
          correctAnswer: "",
          explanation: "",
        },
      ],
    });
  };

  const removeQuestion = (index: number) => {
    if (!quiz) return;
    if (!confirm("Are you sure you want to remove this question?")) return;
    const updated = quiz.questions.filter((_, i) => i !== index);
    setQuiz({ ...quiz, questions: updated });
  };

  const handleSave = async () => {
    if (!quiz) return;

    // Validation
    const invalidQuestions = quiz.questions.filter(
      (q) => !q.questionText || !q.correctAnswer || q.options.some((o) => !o)
    );
    if (invalidQuestions.length > 0) {
      alert("All questions must have text, 4 options, and a correct answer selected.");
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/quizzes/${quizId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quiz.title,
          description: quiz.description,
          dueDate: quiz.dueDate,
          questions: quiz.questions.map((q) => ({
            id: q.id,
            questionText: q.questionText,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            imageUrl: q.imageUrl,
          })),
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const err = await res.json();
        alert(`Save failed: ${err.error || "Unknown error"}`);
      }
    } catch (error) {
      alert("Network error while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={40} className="animate-spin text-indigo-600" />
        <p className="text-slate-500 font-medium">Loading quiz for editing...</p>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
          <AlertCircle size={32} className="text-red-500" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-slate-500">{error || "Quiz not found"}</p>
        </div>
        <Link
          href="/dashboard/quizzes"
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
        >
          Back to Quizzes
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/quizzes"
            className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors text-slate-600"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Edit Quiz</h1>
            <p className="text-sm text-slate-500">
              {quiz.title} • Grade {quiz.gradeTarget} • {quiz.subject.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-emerald-600 font-semibold text-sm bg-emerald-50 px-3 py-1.5 rounded-lg">
              <CheckCircle2 size={16} /> Saved!
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-6 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-md"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Quiz Metadata */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <h2 className="font-bold text-slate-800">Quiz Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
              Title
            </label>
            <input
              type="text"
              value={quiz.title}
              onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-400 outline-none font-medium text-slate-700"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
              Due Date
            </label>
            <input
              type="date"
              value={quiz.dueDate ? new Date(quiz.dueDate).toISOString().split("T")[0] : ""}
              onChange={(e) => setQuiz({ ...quiz, dueDate: new Date(e.target.value).toISOString() })}
              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-400 outline-none font-medium text-slate-700"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
              Description
            </label>
            <textarea
              value={quiz.description || ""}
              onChange={(e) => setQuiz({ ...quiz, description: e.target.value })}
              rows={2}
              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-400 outline-none font-medium text-slate-700 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-slate-800 text-xl">
            Questions ({quiz.questions.length})
          </h2>
          <button
            onClick={addQuestion}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus size={16} /> Add Question
          </button>
        </div>

        {quiz.questions.map((q, idx) => (
          <div
            key={idx}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group"
          >
            <button
              onClick={() => removeQuestion(idx)}
              className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
              title="Remove question"
            >
              <Trash2 size={18} />
            </button>

            <div className="mb-4 pr-10">
              <label className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1 block">
                Question {idx + 1}
              </label>
              <textarea
                value={q.questionText}
                onChange={(e) => updateQuestionField(idx, "questionText", e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none font-bold text-slate-800 resize-none"
                rows={2}
                placeholder="Type your question here..."
              />
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {q.options.map((opt, oIdx) => (
                <div key={oIdx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`answer-${idx}`}
                    checked={q.correctAnswer === opt && opt !== ""}
                    onChange={() => updateQuestionField(idx, "correctAnswer", opt)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(idx, oIdx, e.target.value)}
                    placeholder={`Option ${oIdx + 1}`}
                    className={`w-full p-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-400 ${
                      q.correctAnswer === opt && opt !== ""
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-medium"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Explanation */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                Explanation (optional)
              </label>
              <input
                type="text"
                value={q.explanation}
                onChange={(e) => updateQuestionField(idx, "explanation", e.target.value)}
                placeholder="Why is this answer correct?"
                className="w-full p-2.5 bg-blue-50/50 border border-blue-100 rounded-xl text-sm text-blue-800 outline-none focus:border-blue-400"
              />
            </div>
          </div>
        ))}

        {quiz.questions.length === 0 && (
          <div className="h-48 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
            <p className="font-medium">No questions yet.</p>
            <button
              onClick={addQuestion}
              className="mt-3 text-indigo-600 font-semibold hover:text-indigo-800 transition-colors flex items-center gap-1"
            >
              <Plus size={16} /> Add your first question
            </button>
          </div>
        )}
      </div>

      {/* Bottom Save */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-8 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-md"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? "Saving..." : "Save All Changes"}
        </button>
      </div>
    </div>
  );
}