"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { questions } from "@/lib/mockData";
import { MathRenderer } from "@/components/MathRenderer";
import { getCurrentRole, getRoleScopedKey } from "@/components/roleStorage";

const STATS_KEY = "mathforce_train_stats";
const WEAK_TOPIC_KEY = "mathforce_weak_topic";
const COUNTDOWN_SECONDS = 3 * 60; // 3 minutes

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Allowed question difficulties for the selected level.
 * 1 → only 1; 2 → 1,2; 3 → 2,3; 4 → 3,4; 5 → 4,5.
 */
function getAllowedDifficulties(selectedDifficulty: number): number[] {
  switch (selectedDifficulty) {
    case 1:
      return [1];
    case 2:
      return [1, 2];
    case 3:
      return [2, 3];
    case 4:
      return [3, 4];
    case 5:
      return [4, 5];
    default:
      return [2, 3];
  }
}

function getSessionQuestions(
  selectedGrade: number,
  selectedDifficulty: number,
  count: number,
  weakTopic?: string
) {
  const allowedDifficulties = getAllowedDifficulties(selectedDifficulty);
  const filtered = questions.filter(
    (q) =>
      q.grade === selectedGrade &&
      allowedDifficulties.includes(q.difficulty)
  );
  if (!filtered.length) return [];

  // Topic-based adaptive reinforcement: bias toward weakTopic if available
  if (weakTopic) {
    const weakPool = filtered.filter((q) => q.topic === weakTopic);
    if (weakPool.length) {
      const normalPool = filtered.filter((q) => q.topic !== weakTopic);
      const weakTarget = Math.round(count * 0.6);
      const weakCount = Math.min(weakTarget, weakPool.length);
      const normalCount = Math.max(0, count - weakCount);

      const selectedWeak = shuffle(weakPool).slice(0, weakCount);
      const selectedNormal = shuffle(normalPool).slice(0, normalCount);
      return shuffle([...selectedWeak, ...selectedNormal]);
    }
  }

  const shuffled = shuffle(filtered);
  return shuffled.slice(0, count);
}

function formatMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TrainPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedGrade = Math.min(11, Math.max(5, Number(searchParams.get("grade")) || 5));
  const selectedDifficulty = Math.min(5, Math.max(1, Number(searchParams.get("difficulty")) || 3));
  const requestedCount = Math.min(30, Math.max(1, Number(searchParams.get("count")) || 10));

  const [weakTopic, setWeakTopic] = useState<string | null>(null);

  // Load weak topic for this grade (if any)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const role = getCurrentRole();
      const key = getRoleScopedKey(WEAK_TOPIC_KEY, role);
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        setWeakTopic(null);
        return;
      }
      const parsed = JSON.parse(raw) as { grade: number; topic: string };
      if (parsed.grade === selectedGrade) {
        setWeakTopic(parsed.topic);
      } else {
        setWeakTopic(null);
      }
    } catch {
      setWeakTopic(null);
    }
  }, [selectedGrade]);

  const sessionQuestions = useMemo(
    () =>
      getSessionQuestions(
        selectedGrade,
        selectedDifficulty,
        requestedCount,
        weakTopic ?? undefined
      ),
    [selectedGrade, selectedDifficulty, requestedCount, weakTopic]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_SECONDS);
  const [timeUp, setTimeUp] = useState(false);

  // Training statistics
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [questionTimes, setQuestionTimes] = useState<number[]>([]);
  const [answerHistory, setAnswerHistory] = useState<boolean[]>([]);
  const [wrongTopics, setWrongTopics] = useState<string[]>([]);
  const [showStabilityHint, setShowStabilityHint] = useState(false);
  const [showPressureTransition, setShowPressureTransition] = useState(false);

  const sessionStartRef = useRef<number>(Date.now());
  const questionStartRef = useRef<number>(Date.now());

  const question = sessionQuestions[currentIndex];
  const isLastQuestion = currentIndex === sessionQuestions.length - 1;
  const hasNoQuestions = sessionQuestions.length === 0;
  const isLowTime = timeLeft > 0 && timeLeft < 30;
  const isCriticalTime = timeLeft > 0 && timeLeft <= 10;

  // Derived pressure + PAI status for system bar
  const pressureStage = timeLeft <= 10 ? 3 : timeLeft < 60 ? 2 : 1;
  let currentPAI: number | null = null;
  if (totalQuestions > 0) {
    const A = (correctCount / totalQuestions) * 100;
    const elapsedSeconds = Math.max(
      1,
      Math.floor((Date.now() - sessionStartRef.current) / 1000)
    );
    let T = (COUNTDOWN_SECONDS / elapsedSeconds) * 100;
    if (T > 100) T = 100;
    const S = (maxStreak / totalQuestions) * 100;
    currentPAI = Math.round(A * 0.5 + T * 0.3 + S * 0.2);
  }

  // Persist current pressure stage so the top system bar can show it
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem("mathforce_pressure_stage", String(pressureStage));
  }, [pressureStage]);

  // Track pressure stage transitions for visual cue
  const previousPressureStageRef = useRef<number>(pressureStage);

  useEffect(() => {
    const prev = previousPressureStageRef.current;
    if (pressureStage > prev) {
      setShowPressureTransition(true);
      const timeoutId = window.setTimeout(() => {
        setShowPressureTransition(false);
      }, 1500);
      previousPressureStageRef.current = pressureStage;
      return () => window.clearTimeout(timeoutId);
    }
    previousPressureStageRef.current = pressureStage;
  }, [pressureStage]);

  // Real-time stability fluctuation detection (subtle hint)
  useEffect(() => {
    if (questionTimes.length < 3 || totalQuestions === 0) return;

    const mean =
      questionTimes.reduce((sum, t) => sum + t, 0) / questionTimes.length;
    const variance =
      questionTimes.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) /
      questionTimes.length;
    const stdDev = Math.sqrt(variance);

    const accuracy =
      totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
    const PRESSURE_STDDEV_THRESHOLD = 10;

    if (accuracy > 80 && stdDev > PRESSURE_STDDEV_THRESHOLD) {
      setShowStabilityHint(true);
      const timeoutId = window.setTimeout(() => {
        setShowStabilityHint(false);
      }, 3000);
      return () => window.clearTimeout(timeoutId);
    }
  }, [questionTimes, totalQuestions, correctCount]);

  // Countdown timer
  useEffect(() => {
    if (timeUp || timeLeft <= 0) return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) return 0;
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [timeUp, timeLeft]);

  // Persist stats so /result can read them (totalTimeUsed set on navigate)
  useEffect(() => {
    sessionStorage.setItem(
      STATS_KEY,
      JSON.stringify({
        totalQuestions,
        correctCount,
        wrongCount,
        maxStreak,
        questionTimes,
        difficulty: selectedDifficulty,
        answerHistory,
        grade: selectedGrade,
        wrongTopics,
      })
    );
  }, [
    totalQuestions,
    correctCount,
    wrongCount,
    maxStreak,
    questionTimes,
    answerHistory,
    selectedDifficulty,
    selectedGrade,
    wrongTopics,
  ]);

  // When 00:00 — auto-submit (if needed), save totalTimeUsed and navigate to /result
  useEffect(() => {
    if (timeLeft !== 0 || timeUp) return;
    setTimeUp(true);

    // Auto-submit current question when time is up
    if (question && !submitted) {
      if (selectedOption !== null) {
        // Auto-submit selected answer
        handleSubmit();
      } else {
        // No answer selected: count as wrong with recorded time
        const elapsedSeconds = Math.max(
          0,
          Math.round((Date.now() - questionStartRef.current) / 1000)
        );
        setQuestionTimes((prev) => [...prev, elapsedSeconds]);
        setAnswerHistory((prev) => [...prev, false]);
        setWrongTopics((prev) => [...prev, question.topic]);
        setTotalQuestions((n) => n + 1);
        setWrongCount((n) => n + 1);
        setCurrentStreak(0);
        setSubmitted(true);
      }
    }

    const totalTimeUsed = Math.floor(
      (Date.now() - sessionStartRef.current) / 1000
    );
    const stored = sessionStorage.getItem(STATS_KEY);
    const stats = stored ? JSON.parse(stored) : {};
    sessionStorage.setItem(
      STATS_KEY,
      JSON.stringify({ ...stats, totalTimeUsed })
    );

    // Short delay so "Уақыт аяқталды" is visible before redirect
    const timeoutId = setTimeout(() => {
      router.push("/result");
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [
    timeLeft,
    timeUp,
    question,
    submitted,
    selectedOption,
    router,
    setAnswerHistory,
    setCurrentStreak,
    setQuestionTimes,
    setTotalQuestions,
    setWrongCount,
    setWrongTopics,
  ]);

  const handleSubmit = () => {
    if (selectedOption === null || !question) return;

    // Record time spent on this question (in seconds)
    const elapsedSeconds = Math.max(
      0,
      Math.round((Date.now() - questionStartRef.current) / 1000)
    );
    setQuestionTimes((prev) => [...prev, elapsedSeconds]);

    const correct = selectedOption === question.correct;
    setAnswerHistory((prev) => [...prev, correct]);
    if (!correct) {
      setWrongTopics((prev) => [...prev, question.topic]);
    }
    setTotalQuestions((n) => n + 1);
    if (correct) {
      setCorrectCount((n) => n + 1);
      const nextStreak = currentStreak + 1;
      setCurrentStreak(nextStreak);
      setMaxStreak((m) => Math.max(m, nextStreak));
    } else {
      setWrongCount((n) => n + 1);
      setCurrentStreak(0);
    }
    setSubmitted(true);
  };

  const handleNext = () => {
    setCurrentIndex((i) => i + 1);
    setSelectedOption(null);
    setSubmitted(false);
    // Reset per-question timer for the next question
    questionStartRef.current = Date.now();
  };

  const isCorrect = question && submitted && selectedOption === question.correct;

  if (hasNoQuestions) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-slate-800 dark:bg-[#0f172a] dark:text-slate-200">
        <p className="text-center text-slate-500 dark:text-slate-400">
          Осы сынып үшін сұрақтар жоқ. Сыныпты басқаша таңдаңыз.
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-6 rounded-lg border border-slate-300 bg-slate-200 px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800"
        >
          Дашбордқа оралу
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-50 text-slate-800 dark:bg-[#0f172a] dark:text-slate-200">
      {/* Subtle radar-style circular background */}
      <div className="radar-bg" />
      {showPressureTransition && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 dark:bg-black/40">
          <div className="rounded-lg border border-slate-400 bg-slate-200/95 px-6 py-3 text-sm font-semibold tracking-wide text-slate-800 shadow-lg dark:border-slate-600 dark:bg-slate-900/85 dark:text-slate-100">
            Қысым деңгейі артты
          </div>
        </div>
      )}
      {/* Top system status bar + countdown (MM:SS) */}
      <header className="flex items-center justify-between border-b border-slate-300 px-6 py-3 text-xs dark:border-slate-700/50">
        {/* Left: system status */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-slate-500 dark:text-slate-400">
          <div className="flex items-baseline gap-1">
            <span className="uppercase tracking-wide text-[0.68rem] text-slate-500">
              Сынып
            </span>
            <span className="font-mono text-slate-700 dark:text-slate-200">
              {selectedGrade}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="uppercase tracking-wide text-[0.68rem] text-slate-500">
              Қиындық
            </span>
            <span className="font-mono text-slate-700 dark:text-slate-200">
              {selectedDifficulty}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="uppercase tracking-wide text-[0.68rem] text-slate-500">
              Қысым кезеңі
            </span>
            <span className="font-mono text-slate-700 dark:text-slate-200">
              {pressureStage}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="uppercase tracking-wide text-[0.68rem] text-slate-500">
              Ағымдағы PAI
            </span>
            <span className="font-mono text-slate-700 dark:text-slate-200">
              {currentPAI !== null ? currentPAI : "–"}
            </span>
          </div>
        </div>
        {/* Right: countdown with pressure effect */}
        <div className="flex flex-col items-end">
          {showStabilityHint && (
            <div className="mb-1 text-[0.65rem] font-medium uppercase tracking-wide text-sky-600 dark:text-sky-300/80">
              Тұрақсыздық анықталды
            </div>
          )}
          <div
            className={`font-mono text-3xl font-light tabular-nums ${
              isCriticalTime
                ? "timer-pulse text-red-500 dark:text-red-400"
                : isLowTime
                  ? "text-red-500 dark:text-red-400"
                  : "text-slate-700 dark:text-slate-100"
            }`}
          >
            {formatMMSS(Math.max(0, timeLeft))}
          </div>
          {timeUp && (
            <div className="mt-1 text-[0.65rem] font-medium uppercase tracking-wide text-red-500 dark:text-red-400">
              Уақыт аяқталды
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          {/* Question */}
          <p className="mb-10 text-center text-lg leading-relaxed text-slate-700 dark:text-slate-300">
            <MathRenderer as="span">{question.question}</MathRenderer>
          </p>

          {/* Options */}
          <div className="space-y-3">
            {(["A", "B", "C", "D"] as const).map((letter, i) => {
              const isSelected = selectedOption === i;
              const showCorrect =
                submitted && i === question.correct;
              const showWrong =
                submitted && isSelected && i !== question.correct;
              return (
                <button
                  key={letter}
                  type="button"
                  disabled={submitted || timeUp}
                  onClick={() => !submitted && !timeUp && setSelectedOption(i)}
                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                    submitted
                      ? showCorrect
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : showWrong
                          ? "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400"
                          : i === question.correct
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700/80 dark:bg-slate-800/30 dark:text-slate-500"
                      : isSelected
                        ? "border-blue-500/60 bg-blue-500/15 text-slate-900 dark:border-[#3b82f6]/60 dark:bg-[#3b82f6]/15 dark:text-white"
                        : "border-slate-300 bg-slate-100 text-slate-700 hover:border-slate-400 hover:bg-slate-200 dark:border-slate-600/80 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800/70"
                  }`}
                >
                  <span className="mr-3 text-slate-500 dark:text-slate-500">{letter}.</span>
                  <MathRenderer>{question.options[i]}</MathRenderer>
                </button>
              );
            })}
          </div>

          {/* Submit / Next */}
          <div className="mt-10 flex flex-col items-center gap-4">
            {!submitted ? (
              <button
                type="button"
                disabled={selectedOption === null || timeUp}
                onClick={handleSubmit}
                className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#3b82f6] dark:hover:bg-blue-600"
              >
                Жіберу
              </button>
            ) : (
              <>
                <p
                  className={`text-lg font-medium ${
                    isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {isCorrect ? "Дұрыс!" : "Қате!"}
                </p>
                {!isLastQuestion ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="rounded-lg border border-slate-300 bg-slate-200 px-8 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800"
                  >
                    Келесі сұрақ
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const totalTimeUsed = Math.floor(
                        (Date.now() - sessionStartRef.current) / 1000
                      );
                      const stored = sessionStorage.getItem(STATS_KEY);
                      const stats = stored ? JSON.parse(stored) : {};
                      sessionStorage.setItem(
                        STATS_KEY,
                        JSON.stringify({ ...stats, totalTimeUsed })
                      );
                      router.push("/result");
                    }}
                    className="rounded-lg border border-slate-300 bg-slate-200 px-8 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800"
                  >
                    Нәтижені көру
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
