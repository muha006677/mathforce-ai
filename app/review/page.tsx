"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { questions } from "@/lib/mockData";
import { MathRenderer } from "@/components/MathRenderer";
import { getCurrentRole, getRoleScopedKey } from "@/components/roleStorage";

const STATS_KEY = "mathforce_train_stats";
const REVIEW_RESULTS_KEY = "mathforce_review_results";

type StoredStats = {
  wrongTopics?: string[];
  answerHistory?: boolean[];
  // optional future fields
  wrongQuestionIds?: number[];
  grade?: number;
  difficulty?: number;
  totalQuestions?: number;
};

type ReviewQuestion = (typeof questions)[number];

export default function ReviewPage() {
  const router = useRouter();
  const [reviewQuestions, setReviewQuestions] = useState<ReviewQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [reviewCorrect, setReviewCorrect] = useState(0);
  const [reviewWrong, setReviewWrong] = useState(0);
   // For "Қайта жаттығу" (retrain with same settings)
  const [retrainGrade, setRetrainGrade] = useState<number | null>(null);
  const [retrainDifficulty, setRetrainDifficulty] = useState<number | null>(null);
  const [retrainCount, setRetrainCount] = useState<number | null>(null);
  // Load review questions based on last training stats
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(STATS_KEY);
      if (!raw) return;
      const stats = JSON.parse(raw) as StoredStats & {
        // we may later add explicit wrongQuestionIds
        questionTimes?: number[];
      };

      // For now, approximate: take all questions that were answered wrong in last run
      // by matching topics and using answerHistory length; if we later add explicit
      // wrongQuestionIds, this can be tightened.
      const fullHistory = stats.answerHistory ?? [];
      const wrongTopics = stats.wrongTopics ?? [];

      // Fallback: if we don't have per-question IDs, we can't perfectly reconstruct;
      // so we keep review as “best-effort” using topic-based wrong area.
      if (!wrongTopics.length) return;

      const weakTopic = (() => {
        const counts: Record<string, number> = {};
        for (const t of wrongTopics) {
          counts[t] = (counts[t] ?? 0) + 1;
        }
        let best: string | null = null;
        let bestCount = 0;
        for (const t of Object.keys(counts)) {
          if (counts[t] > bestCount) {
            bestCount = counts[t];
            best = t;
          }
        }
        return best;
      })();

      if (!weakTopic) return;

      const pool = questions.filter((q) => q.topic === weakTopic);
      if (!pool.length) return;

      setReviewQuestions(pool.slice(0, 10)); // limit to 10 for review

      // Preserve training configuration for "Қайта жаттығу"
      if (typeof stats.grade === "number") {
        setRetrainGrade(stats.grade);
      }
      if (typeof stats.difficulty === "number") {
        setRetrainDifficulty(stats.difficulty);
      }
      if (typeof stats.totalQuestions === "number" && stats.totalQuestions > 0) {
        setRetrainCount(stats.totalQuestions);
      }
    } catch {
      // ignore
    }
  }, []);

  // Warn in console when Blackboard fields are missing so content authors can fill them.
  useEffect(() => {
    const question = reviewQuestions[currentIndex];
    if (!question) return;
    // Log full question for debugging solutionSteps / Blackboard data.
    console.log("[MathForce Review] Current review question:", question);
    if (!question.given || question.given.length === 0) {
      console.warn(
        `[MathForce Review] Question ${question.id} missing 'given' data for Blackboard mode.`
      );
    }
    if (!question.solutionSteps || question.solutionSteps.length === 0) {
      console.warn(
        `[MathForce Review] Question ${question.id} missing 'solutionSteps' data for Blackboard mode.`
      );
    }
    if (!question.finalAnswer || question.finalAnswer.trim().length === 0) {
      console.warn(
        `[MathForce Review] Question ${question.id} missing 'finalAnswer' data for Blackboard mode.`
      );
    }
  }, [reviewQuestions, currentIndex]);

  if (!reviewQuestions.length) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-slate-800 dark:bg-[#0f172a] dark:text-slate-200">
        <p className="mb-4 text-slate-500 dark:text-slate-400">
          Қайта қарауға арналған қате сұрақтар табылмады.
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-lg border border-slate-300 bg-slate-200 px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800"
        >
          Дашбордқа оралу
        </button>
      </div>
    );
  }

  const question = reviewQuestions[currentIndex];
  const isLast = currentIndex === reviewQuestions.length - 1;

  const handleSubmit = () => {
    if (selectedOption === null) return;
    const isCorrect = selectedOption === question.correct;
    if (isCorrect) {
      setReviewCorrect((c) => c + 1);
    } else {
      setReviewWrong((w) => w + 1);
    }
    setSubmitted(true);
  };

  const handleNext = () => {
    setSelectedOption(null);
    setSubmitted(false);
    if (!isLast) {
      setCurrentIndex((i) => i + 1);
    } else {
      // Store review summary per role in localStorage
      if (typeof window !== "undefined") {
        try {
          const role = getCurrentRole();
          const key = getRoleScopedKey(REVIEW_RESULTS_KEY, role);
          const raw = window.localStorage.getItem(key);
          let list: {
            date: string;
            total: number;
            correct: number;
            wrong: number;
          }[] = [];
          if (raw) {
            list = JSON.parse(raw) as typeof list;
          }
          const total = reviewCorrect + reviewWrong;
          list.push({
            date: new Date().toISOString(),
            total,
            correct: reviewCorrect,
            wrong: reviewWrong,
          });
          window.localStorage.setItem(key, JSON.stringify(list));
        } catch {
          // ignore
        }
      }
      router.push("/result");
    }
  };

  const handleGoBack = () => {
    router.push("/result");
  };

  const handleGoHome = () => {
    router.push("/");
  };

  const handleRetrain = () => {
    const grade = retrainGrade ?? 5;
    const difficulty = retrainDifficulty ?? 3;
    const count = retrainCount ?? 10;
    router.push(
      `/train?grade=${encodeURIComponent(
        grade
      )}&difficulty=${encodeURIComponent(
        difficulty
      )}&count=${encodeURIComponent(count)}`
    );
  };

  const isCorrectSelection =
    submitted && selectedOption !== null && selectedOption === question.correct;

  const explanationText =
    question.explanation ??
    `Бұл сұрақта дұрыс жауап "${question.options[question.correct]}".`;
  const given = Array.isArray(question.given) ? question.given : [];
  const solutionSteps = Array.isArray(question.solutionSteps)
    ? question.solutionSteps
    : [];
  const finalAnswer =
    question.finalAnswer ?? question.options[question.correct];
  const hasGiven = given.length > 0;
  const hasSolutionSteps = solutionSteps.length > 0;
  const hasFinalAnswer =
    typeof finalAnswer === "string" && finalAnswer.trim().length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800 dark:bg-[#0f172a] dark:text-slate-200">
      {/* Top navigation bar */}
      <header className="flex w-full justify-start px-6 pt-4">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleGoBack}
            className="rounded-md border border-slate-300 bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-300 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800/90"
          >
            Артқа
          </button>
          <button
            type="button"
            onClick={handleGoHome}
            className="rounded-md border border-slate-300 bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-300 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800/90"
          >
            Басты бет
          </button>
          <button
            type="button"
            onClick={handleRetrain}
            className="rounded-md border border-slate-400 bg-slate-300 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-slate-400 dark:border-slate-500 dark:bg-[#1d293b] dark:text-sky-300 dark:hover:border-sky-500 dark:hover:bg-[#111827]"
          >
            Қайта жаттығу
          </button>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-2xl">
          <h1 className="mb-6 text-center font-mono text-xl font-semibold text-slate-800 dark:text-white">
            Қате сұрақтарды қайта қарау
          </h1>

          {/* Question */}
          <p className="mb-10 text-center text-lg leading-relaxed text-slate-700 dark:text-slate-300">
            <MathRenderer as="span">{question.question}</MathRenderer>
          </p>

          {/* Options */}
          <div className="space-y-3">
            {(["A", "B", "C", "D"] as const).map((letter, i) => {
              const isSelected = selectedOption === i;
              const isCorrect = i === question.correct;
              const showCorrect = submitted && isCorrect;
              const showWrong =
                submitted && isSelected && !isCorrect;

              return (
                <button
                  key={letter}
                  type="button"
                  disabled={submitted}
                  onClick={() => !submitted && setSelectedOption(i)}
                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                    submitted
                      ? showCorrect
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : showWrong
                          ? "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400"
                          : "border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700/80 dark:bg-slate-800/30 dark:text-slate-500"
                      : isSelected
                        ? "border-blue-500/60 bg-blue-500/15 text-slate-900 dark:border-[#3b82f6]/60 dark:bg-[#3b82f6]/15 dark:text-white"
                        : "border-slate-300 bg-slate-100 text-slate-700 hover:border-slate-400 hover:bg-slate-200 dark:border-slate-600/80 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800/70"
                  }`}
                >
                  <span className="mr-3 text-slate-500">{letter}.</span>
                  <MathRenderer>{question.options[i]}</MathRenderer>
                </button>
              );
            })}
          </div>

          {/* Feedback & controls */}
          <div className="mt-8 flex flex-col items-center gap-3">
            {!submitted ? (
              <button
                type="button"
                disabled={selectedOption === null}
                onClick={handleSubmit}
                className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#3b82f6] dark:hover:bg-blue-600"
              >
                Жауапты тексеру
              </button>
            ) : (
              <>
                <p
                  className={`text-lg font-medium ${
                    isCorrectSelection ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {isCorrectSelection ? "Дұрыс!" : "Қате. Дұрыс жауап жасылмен белгіленген."}
                </p>
                {!isCorrectSelection && (
                  <div className="mt-4 w-full rounded-lg border border-slate-300 bg-slate-100/90 px-5 py-4 text-slate-700 dark:border-slate-700/60 dark:bg-slate-900/50 dark:text-slate-300">
                    <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                      {explanationText}
                    </p>
                    {/* Blackboard Mode: Берілген / Шешуі / Жауабы */}
                    {(hasGiven || hasSolutionSteps || hasFinalAnswer) && (
                      <div className="space-y-5">
                        {/* 1. Берілген */}
                        {hasGiven && (
                          <>
                            <div>
                              <div className="mb-2 font-semibold text-slate-200">
                                Берілген:
                              </div>
                              <div className="border-l-2 border-slate-600/60 pl-4">
                                <ul className="space-y-2">
                                  {given.map((item, idx) => (
                                    <li key={idx}>
                                      <MathRenderer as="div" blockMode>
                                        {item}
                                      </MathRenderer>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                            {(hasSolutionSteps || hasFinalAnswer) && (
                              <div className="h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent" />
                            )}
                          </>
                        )}
                        {/* 2. Шешуі */}
                        {hasSolutionSteps && (
                          <>
                            <div>
                              <div className="mb-2 font-semibold text-slate-200">
                                Шешуі:
                              </div>
                              <div className="border-l-2 border-slate-600/60 pl-4">
                                <ol className="list-decimal space-y-2 pl-4">
                                  {solutionSteps.map((step, idx) => (
                                    <li key={idx}>
                                      <MathRenderer as="div" blockMode>
                                        {step}
                                      </MathRenderer>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            </div>
                            {hasFinalAnswer && (
                              <div className="h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent" />
                            )}
                          </>
                        )}
                        {/* 3. Жауабы */}
                        {hasFinalAnswer && (
                          <div>
                            <div className="mb-2 font-semibold text-slate-200">
                              Жауабы:
                            </div>
                            <div className="border-l-2 border-emerald-600/50 pl-4">
                              <MathRenderer as="div" blockMode>
                                {finalAnswer}
                              </MathRenderer>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded-lg border border-slate-300 bg-slate-200 px-8 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800"
                >
                  {isLast ? "Нәтижеге оралу" : "Келесі сұрақ"}
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

