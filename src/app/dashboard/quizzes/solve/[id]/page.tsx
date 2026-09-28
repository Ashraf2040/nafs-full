"use client";
import { useState, useEffect, use, useRef } from "react";
import {
  CheckCircle2, XCircle, ArrowRight, ArrowLeft,
  Timer, Loader2, RefreshCcw, Trophy, AlertCircle,
  BookOpen, TrendingUp, Image as ImageIcon
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { normalizeImageUrl } from "@/lib/image-url";

const MAX_ATTEMPTS = 3;

function resolveAnswerText(answer: string, options: string[]): string {
  if (!answer || !options || options.length === 0) return answer || "N/A";
  const exactMatch = options.find((opt) => opt === answer);
  if (exactMatch) return exactMatch;
  const letter = answer.trim().charAt(0).toUpperCase();
  const letterMatch = options.find(
    (opt) => opt.trim().charAt(0).toUpperCase() === letter
  );
  if (letterMatch) return letterMatch;
  const prefixMatch = options.find((opt) =>
    opt.trim().startsWith(answer.trim())
  );
  if (prefixMatch) return prefixMatch;
  return answer;
}

// FIX: New helper function to properly compare full answer strings
function isAnswerCorrect(userAnswer: string | undefined, correctAnswer: string | undefined, options: string[]): boolean {
  if (!userAnswer || !correctAnswer) return false;
  
  // Use resolveAnswerText to normalize the AI's correct answer into the exact option string
  const correctOptionText = resolveAnswerText(correctAnswer, options);
  
  // Compare the full strings (case-insensitive and trimmed)
  return userAnswer.trim().toLowerCase() === correctOptionText.trim().toLowerCase();
}

export default function SolveQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session } = useSession();
  const resolvedParams = use(params);
  const quizId = resolvedParams.id;
  const userRole = (session?.user as any)?.role;

  const [quiz, setQuiz] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [attempts, setAttempts] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [savedScore, setSavedScore] = useState<number | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState<number | null>(null);
  const [saveError, setSaveError] = useState("");
  const startTime = useRef(Date.now());

  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [correctPopup, setCorrectPopup] = useState("");
  const popupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (popupTimer.current) clearTimeout(popupTimer.current); }, []);

  useEffect(() => {
     const fetchQuiz = async () => {
      try {
        const res = await fetch(`/api/quizzes/${quizId}`);

        if (res.status === 401) {
          setError("You must be signed in to take this quiz.");
          setIsLoading(false);
          return;
        }

        if (res.status === 403) {
          setError("You are not authorized to access this quiz.");
          setIsLoading(false);
          return;
        }

        if (res.status === 404) {
          setError("Quiz not found.");
          setIsLoading(false);
          return;
        }

        if (res.status === 410) {
          setError("This quiz is no longer available because its due date has passed.");
          setIsLoading(false);
          return;
        }

        if (!res.ok) {
          setError("Something went wrong while loading the quiz.");
          setIsLoading(false);
          return;
        }

        const data = await res.json();

        // Defensive normalization: map Prisma fields -> frontend fields
        const normalizedQuestions = Array.isArray(data?.questions)
          ? data.questions
              .filter((q: any) => q != null)
              .map((q: any) => ({
                ...q,
                question: q.questionText || q.question || "No question provided",
                answer: q.correctAnswer || q.answer || "",
                options: Array.isArray(q.options) ? q.options : [],
                image_url: normalizeImageUrl(q.image_url || q.imageUrl),
                explanation: q.explanation || "",
              }))
          : [];

        if (
          userRole === "STUDENT" &&
          data.dueDate &&
          new Date(data.dueDate) < new Date()
        ) {
          setError("This quiz is no longer available. Please contact your teacher.");
          setIsLoading(false);
          return;
        }

        // Fetch existing attempts for this student
        if (userRole === "STUDENT") {
          try {
            const attemptsRes = await fetch(`/api/students/quiz-attempts?quizId=${quizId}`);
            if (attemptsRes.ok) {
              const attemptsData = await attemptsRes.json();
              const usedAttempts = attemptsData.attemptsUsed || 0;
              if (usedAttempts >= MAX_ATTEMPTS) {
                setError(`You have used all ${MAX_ATTEMPTS} attempts for this quiz.`);
                setIsLoading(false);
                return;
              }
              setAttempts(usedAttempts + 1);
            }
          } catch {
            // Silently fail - default to attempt 1
          }
        }

        setQuiz({
          ...data,
          questions: normalizedQuestions,
          subject: data.subject || {},
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuiz();
  }, [quizId, userRole]);

  const handleOptionSelect = (option: string) => {
    setSelectedAnswers((previous) => ({ ...previous, [currentQuestion]: option }));
    if (isAnswerCorrect(option, q?.answer, q?.options || [])) {
      const messages = ["Excellent!", "Fantastic!", "Wonderful!", "You got it!", "Brilliant work!"];
      setCorrectPopup(messages[Math.floor(Math.random() * messages.length)]);
      if (popupTimer.current) clearTimeout(popupTimer.current);
      popupTimer.current = setTimeout(() => setCorrectPopup(""), 1800);
    }
  };

  // FIX: Updated to use full string comparison instead of first letter
  const calculateScore = () => {
    if (!quiz?.questions?.length) return 0;
    let correct = 0;
    quiz.questions.forEach((q: any, idx: number) => {
      if (!q) return;
      if (isAnswerCorrect(selectedAnswers[idx], q.answer, q.options)) correct++;
    });
    return Math.round((correct / quiz.questions.length) * 100);
  };

  const handleRetake = () => {
    if (attempts >= MAX_ATTEMPTS) return;
    setIsSubmitted(false);
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setSavedScore(null);
    setCorrectAnswers(null);
    setSaveError("");
    setAttempts((prev) => prev + 1);
    startTime.current = Date.now();
  };

  const handleSubmit = async () => {
    if (!quiz?.questions) return;

    if (userRole !== "STUDENT") {
      setSavedScore(calculateScore());
      setCorrectAnswers(
        quiz.questions.filter((q: any, idx: number) =>
          isAnswerCorrect(selectedAnswers[idx], q.answer, q.options),
        ).length,
      );
      setIsSubmitted(true);
      return;
    }

    setIsSaving(true);
    setSaveError("");

    try {
      // FIX: Updated to use full string comparison instead of first letter
      const formattedAnswers = quiz.questions.map((q: any, idx: number) => ({
        questionId: q.id,
        studentAnswer: selectedAnswers[idx] || "",
        isCorrect: isAnswerCorrect(selectedAnswers[idx], q.answer, q.options),
      }));

      const elapsed = Math.floor((Date.now() - startTime.current) / 1000);

      const res = await fetch("/api/results/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId,
          answers: formattedAnswers,
          timeSpentSeconds: elapsed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.details || `Error ${res.status}`);
      }

      const reviewByQuestion = new Map(
        (data.review || []).map((item: any) => [item.questionId, item]),
      );
      setQuiz((current: any) => ({
        ...current,
        questions: current.questions.map((question: any) => {
          const review = reviewByQuestion.get(question.id) as any;
          return review
            ? {
                ...question,
                answer: review.correctAnswer,
                explanation: review.explanation || "",
                serverIsCorrect: review.isCorrect,
              }
            : question;
        }),
      }));
      setSavedScore(Number(data.score));
      setCorrectAnswers(
        typeof data.correctAnswers === "number"
          ? data.correctAnswers
          : (data.review || []).filter((item: any) => item.isCorrect).length,
      );
      if (typeof data.attemptsUsed === "number") setAttempts(data.attemptsUsed);
      setIsSubmitted(true);
    } catch (err: any) {
      console.error("Error saving result:", err.message);
      setSaveError(err.message || "Your result could not be saved. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={40} className="animate-spin text-indigo-600" />
        <p className="text-slate-500 font-medium">Loading your assessment...</p>
      </div>
    );
  }

 if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
          <AlertCircle size={32} className="text-red-500" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-slate-500 max-w-md">{error}</p>
        </div>
      </div>
    );
  }

  if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    return (
      <div className="text-center mt-20 text-red-500 font-bold">
        Error: Failed to load quiz
      </div>
    );
  }

  if (isSubmitted) {
    const score = savedScore ?? calculateScore();
    let feedbackEmoji = "🎯";
    let feedbackMessage = "Good effort!";
    let feedbackColor = "text-amber-600";
    let bgColor = "bg-amber-50";
    if (score === 100) {
      feedbackEmoji = "🏆";
      feedbackMessage = "Perfect Score! Outstanding achievement!";
      feedbackColor = "text-emerald-600";
      bgColor = "bg-emerald-50";
    } else if (score >= 80) {
      feedbackEmoji = "🌟";
      feedbackMessage = "Excellent Work! You have mastered this topic.";
      feedbackColor = "text-emerald-600";
      bgColor = "bg-emerald-50";
    } else if (score >= 60) {
      feedbackEmoji = "👍";
      feedbackMessage = "Good effort! Review the mistakes and try again.";
      feedbackColor = "text-blue-600";
      bgColor = "bg-blue-50";
    } else {
      feedbackEmoji = "📚";
      feedbackMessage = "Keep practicing! Review the material below carefully.";
      feedbackColor = "text-red-600";
      bgColor = "bg-red-50";
    }

    return (
      <div className="max-w-7xl mx-auto py-10 px-4 space-y-8">
        <div
          className={`text-center p-10 ${bgColor} rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden`}
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
          <div className="text-6xl mb-4">{feedbackEmoji}</div>
          <h1 className={`text-5xl font-black ${feedbackColor} mb-2`}>{score}%</h1>
          <p className="text-slate-600 text-xl font-medium mb-8">{feedbackMessage}</p>
          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-800">
                {correctAnswers ?? quiz.questions.filter((q: any, idx: number) =>
                  q && isAnswerCorrect(selectedAnswers[idx], q.answer, q.options),
                ).length}
              </p>
              <p className="text-xs text-slate-500 font-bold uppercase">Correct</p>
            </div>
            <div className="w-px bg-slate-200" />
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-800">
                {quiz.questions.length - (correctAnswers ?? quiz.questions.filter((q: any, idx: number) =>
                  q && isAnswerCorrect(selectedAnswers[idx], q.answer, q.options),
                ).length)}
              </p>
              <p className="text-xs text-slate-500 font-bold uppercase">Incorrect</p>
            </div>
            <div className="w-px bg-slate-200" />
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-800">
                {attempts}/{MAX_ATTEMPTS}
              </p>
              <p className="text-xs text-slate-500 font-bold uppercase">Attempts</p>
            </div>
          </div>
          <div className="flex justify-center gap-4 flex-wrap">
            {attempts < MAX_ATTEMPTS && score < 80 ? (
              <button
                onClick={handleRetake}
                className="flex items-center gap-2 bg-indigo-50 text-indigo-700 border-2 border-indigo-100 px-6 py-3 rounded-xl font-bold hover:bg-indigo-100 transition-colors"
              >
                <RefreshCcw size={18} /> Retake Quiz ({MAX_ATTEMPTS - attempts} left)
              </button>
            ) : (
              <div className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
                <CheckCircle2 size={18} /> Quiz Completed
              </div>
            )}
            <button
              onClick={() => (window.location.href = "/dashboard/quizzes")}
              className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-md"
            >
              Return to Dashboard
            </button>
            {score >= 80 && (
              <Link
                href="/dashboard/certificates"
                className="flex items-center gap-2 bg-amber-50 text-amber-700 border-2 border-amber-200 px-6 py-3 rounded-xl font-bold hover:bg-amber-100 transition-colors"
              >
                <Trophy size={18} /> View Certificates
              </Link>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen size={24} className="text-indigo-600" /> Detailed Report
          </h2>
          {quiz?.questions?.map((q: any, idx: number) => {
            if (!q) return null;
            const userAnswer = selectedAnswers[idx];
            // FIX: Updated to use full string comparison
            const isCorrect = typeof q.serverIsCorrect === "boolean"
              ? q.serverIsCorrect
              : isAnswerCorrect(userAnswer, q.answer, q.options || []);
            const userAnswerFull = resolveAnswerText(userAnswer, q.options || []);
            const correctAnswerFull = resolveAnswerText(q.answer, q.options || []);
            return (
              <div
                key={idx}
                className={`p-6 rounded-2xl border-2 transition-all ${
                  isCorrect
                    ? "bg-emerald-50/50 border-emerald-100"
                    : "bg-rose-50/50 border-rose-100"
                }`}
              >
                <div className="flex gap-4 items-start">
                  <div className="mt-1">
                    {isCorrect ? (
                      <CheckCircle2 className="text-emerald-500" size={24} />
                    ) : (
                      <XCircle className="text-rose-500" size={24} />
                    )}
                  </div>
                  <div className="flex-1 space-y-4">
                    <h3 className="text-lg font-bold text-slate-800">
                      <span className="text-slate-400 mr-2">{idx + 1}.</span>{" "}
                      {q.question}
                    </h3>
                    {q?.image_url && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-w-md">
                        <img
                          src={q.image_url}
                          alt="Question illustration"
                          className="w-full max-h-48 object-contain"
                        />
                      </div>
                    )}
                    <div className="space-y-2 text-sm font-medium">
                      <div
                        className={`p-3 rounded-xl flex justify-between items-center ${
                          isCorrect
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        <span>
                          <strong>Your Answer:</strong>{" "}
                          {userAnswerFull || "No answer selected"}
                        </span>
                      </div>
                      {!isCorrect && (
                        <div className="p-3 rounded-xl bg-indigo-50 text-indigo-800 flex justify-between items-center">
                          <span>
                            <strong>Correct Answer:</strong> {correctAnswerFull}
                          </span>
                        </div>
                      )}
                    </div>
                    {q.explanation && (
                      <div className="mt-4 pt-4 border-t border-slate-200/50 text-slate-600 text-sm">
                        <strong className="text-slate-800">Explanation: </strong>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const q = quiz?.questions?.[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  // Extra guard: if the question slot is somehow missing
  if (!q) {
    return (
      <div className="max-w-5xl mx-auto py-10 px-4 text-center">
        <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-red-600">Question not found</h2>
        <p className="text-slate-500">This question appears to be missing or corrupted.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      {correctPopup && (
        <div role="status" aria-live="assertive" className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-[2px]">
          <div className="animate-bounce rounded-3xl border-4 border-emerald-200 bg-white px-10 py-8 text-center shadow-2xl shadow-emerald-900/20">
            <div className="mb-2 text-5xl" aria-hidden="true">🌟</div>
            <p className="text-3xl font-black text-emerald-600">{correctPopup}</p>
            <p className="mt-2 font-semibold text-slate-500">That answer is correct!</p>
          </div>
        </div>
      )}
      {enlargedImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={enlargedImage}
              alt="Enlarged question image"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl"
            />
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 shadow-lg"
            >
              <XCircle size={20} />
            </button>
          </div>
        </div>
      )}
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <div className="w-full bg-slate-100 rounded-full h-2 mb-6 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{quiz.title}</h1>
              <p className="text-sm text-slate-500 mt-1">
                {quiz.subject?.name || "Assessment"} • Grade {quiz.gradeTarget}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                Attempt {attempts}/{MAX_ATTEMPTS}
              </span>
              <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full text-slate-600 font-mono">
                <Timer size={18} /> Q {currentQuestion + 1} of {quiz.questions.length}
              </div>
            </div>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mb-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">{q?.question}</h2>
            {q?.image_url && (
              <div
                className="mb-6 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 cursor-pointer group relative"
                onClick={() => setEnlargedImage(q.image_url)}
              >
                <img
                  src={q.image_url}
                  alt="Question illustration"
                  className="w-full max-h-64 object-contain"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 shadow-sm flex items-center gap-1">
                    <ImageIcon size={14} /> Click to enlarge
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-4">
              {(q?.options || []).map((option: string) => (
                <button
                  key={option}
                  onClick={() => handleOptionSelect(option)}
                  className={`w-full p-4 rounded-2xl text-left border-2 transition-all font-medium ${
                    selectedAnswers[currentQuestion] === option
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md transform scale-[1.01]"
                      : "border-slate-100 hover:border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedAnswers[currentQuestion] === option
                          ? "border-indigo-600 bg-indigo-600"
                          : "border-slate-300"
                      }`}
                    >
                      {selectedAnswers[currentQuestion] === option && (
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                      )}
                    </div>
                    {option}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between">
            <button
              disabled={currentQuestion === 0}
              onClick={() => setCurrentQuestion((prev) => prev - 1)}
              className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors"
            >
              <ArrowLeft size={20} /> Previous
            </button>
            {currentQuestion === quiz.questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={!selectedAnswers[currentQuestion] || isSaving}
                className="bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-600 transition-shadow shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                {isSaving ? "Saving..." : "Submit Quiz"}
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestion((prev) => prev + 1)}
                disabled={!selectedAnswers[currentQuestion]}
                className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-shadow shadow-md disabled:opacity-50"
              >
                Next <ArrowRight size={20} />
              </button>
            )}
          </div>
          {saveError && (
            <div role="alert" className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Your quiz has not been saved yet.</p>
                <p>{saveError} Your answers are still here; please submit again.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
