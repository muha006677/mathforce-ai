"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentRole, getRoleScopedKey } from "@/components/roleStorage";
import { appendSessionToStudentProfile, type StudentSessionRecord } from "@/components/studentProfile";

const STATS_KEY = "mathforce_train_stats";
const HISTORY_KEY = "mathforce_training_history";
const WEAK_TOPIC_KEY = "mathforce_weak_topic";
const STANDARD_TIME_SECONDS = 180;

type StoredStats = {
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  maxStreak: number;
  totalTimeUsed?: number;
  questionTimes?: number[];
  answerHistory?: boolean[];
  difficulty?: number;
  grade?: number;
  wrongTopics?: string[];
};

function calculatePAI(stats: StoredStats | null): number | null {
  if (!stats) return null;
  const { totalQuestions, correctCount, maxStreak, totalTimeUsed } = stats;
  if (totalQuestions === 0 || totalTimeUsed == null || totalTimeUsed <= 0)
    return null;

  const A = (correctCount / totalQuestions) * 100;
  let T = (STANDARD_TIME_SECONDS / totalTimeUsed) * 100;
  if (T > 100) T = 100;
  const S = (maxStreak / totalQuestions) * 100;

  const PAI = A * 0.5 + T * 0.3 + S * 0.2;
  return Math.round(PAI);
}

function getStoredStats(): StoredStats | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STATS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredStats;
  } catch {
    return null;
  }
}

type TrainingHistoryItem = {
  date: string;
  PAI: number;
  accuracy: number;
  avgTime: number;
  trainingTimeLimit: number;
  ERA: string;
};

function getTrainingHistory(): TrainingHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const role = getCurrentRole();
    const key = getRoleScopedKey(HISTORY_KEY, role);
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as TrainingHistoryItem[];
  } catch {
    return [];
  }
}

function useResultStats() {
  const [stats, setStats] = useState<StoredStats | null>(null);
  useEffect(() => {
    setStats(getStoredStats());
  }, []);
  return stats;
}

export default function ResultPage() {
  const stats = useResultStats();
  const router = useRouter();
  const [previousPAI, setPreviousPAI] = useState<number | null>(null);
  const [paiTrend, setPaiTrend] = useState<"up" | "down" | null>(null);
  const total = stats?.totalQuestions ?? 0;
  const correct = stats?.correctCount ?? 0;
  const wrong = stats?.wrongCount ?? 0;
  const maxStreak = stats?.maxStreak ?? 0;
  const accuracy =
    total > 0 ? Math.round((correct / total) * 100) : 0;
  const pai = calculatePAI(stats);

  // ERA analysis
  const messages: string[] = [];
  const times = stats?.questionTimes ?? [];
  const history = stats?.answerHistory ?? [];
  const wrongTopics = stats?.wrongTopics ?? [];

  const avgTime =
    times.length > 0
      ? times.reduce((sum, t) => sum + t, 0) / times.length
      : null;

  // Pressure stability metrics (mean and std deviation of question times)
  let stdDev: number | null = null;
  if (times.length > 1 && avgTime !== null) {
    const variance =
      times.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) /
      times.length;
    stdDev = Math.sqrt(variance);
  }

  // Longest wrong streak
  let longestWrongStreak = 0;
  if (history.length > 0) {
    let currentStreak = 0;
    for (const isCorrect of history) {
      if (!isCorrect) {
        currentStreak += 1;
        if (currentStreak > longestWrongStreak) {
          longestWrongStreak = currentStreak;
        }
      } else {
        currentStreak = 0;
      }
    }
  }

  // Time variance (very simple measure using range)
  let highVariance = false;
  if (times.length >= 3 && avgTime !== null) {
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    highVariance = maxTime - minTime > avgTime; // spread larger than average
  }

  if (avgTime !== null && avgTime < 5 && wrong > 0) {
    messages.push("Careless mistakes: жауаптар өте тез берілген, бірақ қателер бар.");
  }

  if (avgTime !== null && avgTime > 20 && wrong > 0) {
    messages.push("Concept misunderstanding: сұрақтарға көп уақыт жұмсалған, бірақ қателер кездеседі.");
  }

  if (longestWrongStreak >= 3) {
    messages.push("Knowledge gap detected: қатарынан кем дегенде үш қате жауап.");
  }

  if (accuracy > 80 && highVariance) {
    messages.push("Pressure instability: дәлдік жоғары, бірақ уақыт бойынша тұрақсыздық байқалады.");
  }

  // Additional ERA tag for pressure stability based on stdDev
  const PRESSURE_STDDEV_THRESHOLD = 10; // seconds
  if (accuracy > 80 && stdDev !== null && stdDev > PRESSURE_STDDEV_THRESHOLD) {
    messages.push("Pressure instability detected");
  }

  // Determine previous PAI from history to show trend indicator
  useEffect(() => {
    if (typeof window === "undefined") return;
    const history = getTrainingHistory();
    if (!history.length) {
      setPreviousPAI(null);
      setPaiTrend(null);
      return;
    }
    if (history.length === 1) {
      // Only current session recorded
      setPreviousPAI(null);
      setPaiTrend(null);
      return;
    }
    const prev = history[history.length - 2]?.PAI ?? null;
    setPreviousPAI(prev ?? null);
    if (prev != null && pai != null) {
      if (pai > prev) setPaiTrend("up");
      else if (pai < prev) setPaiTrend("down");
      else setPaiTrend(null);
    } else {
      setPaiTrend(null);
    }
  }, [pai]);

  // Adaptive difficulty model with ERA integration
  const previousDifficulty = stats?.difficulty ?? 3;
  let adaptedDifficulty = previousDifficulty;
  let adaptiveMessage: string | null = null;

  const hasCareless = messages.some((m) =>
    m.startsWith("Careless mistakes")
  );
  const hasConcept = messages.some((m) =>
    m.startsWith("Concept misunderstanding")
  );
  const hasKnowledge = messages.some((m) =>
    m.startsWith("Knowledge gap detected")
  );

  // Topic-based weak area
  let weakTopic: string | null = null;
  if (wrongTopics.length > 0) {
    const counts: Record<string, number> = {};
    for (const t of wrongTopics) {
      counts[t] = (counts[t] ?? 0) + 1;
    }
    let bestTopic: string | null = null;
    let bestCount = 0;
    for (const t of Object.keys(counts)) {
      if (counts[t] > bestCount) {
        bestCount = counts[t];
        bestTopic = t;
      }
    }
    weakTopic = bestTopic;
  }

  if (total > 0) {
    // ERA-driven decreases have priority over PAI-based changes
    if (hasKnowledge) {
      // Knowledge gap detected → reduce difficulty by 1, reset time to base (we already use STANDARD_TIME_SECONDS)
      adaptedDifficulty = Math.max(1, previousDifficulty - 1);
      if (adaptedDifficulty !== previousDifficulty) {
        adaptiveMessage = "Қиындық деңгейі төмендетілді.";
      }
    } else if (hasConcept) {
      // Concept misunderstanding → reduce difficulty by 1, keep time unchanged
      adaptedDifficulty = Math.max(1, previousDifficulty - 1);
      if (adaptedDifficulty !== previousDifficulty) {
        adaptiveMessage = "Қиындық деңгейі төмендетілді.";
      }
    } else {
      // PAI-based logic (no strong ERA downgrade signals)
      if (accuracy >= 90 && (pai ?? 0) >= 80 && maxStreak >= 5) {
        adaptedDifficulty = Math.min(5, previousDifficulty + 1);
        if (adaptedDifficulty !== previousDifficulty) {
          adaptiveMessage = "Қиындық деңгейі автоматты түрде артты.";
        }
      } else if (accuracy <= 60 && !hasCareless) {
        // Do NOT reduce difficulty when ERA indicates careless mistakes
        adaptedDifficulty = Math.max(1, previousDifficulty - 1);
        if (adaptedDifficulty !== previousDifficulty) {
          adaptiveMessage = "Қиындық деңгейі төмендетілді.";
        }
      }
    }
  }

  // Persist training history (client-side only) and weak topic
  useEffect(() => {
    if (!stats) return;
    if (typeof window === "undefined") return;

    const times = stats.questionTimes ?? [];
    const avgTimeForRecord =
      times.length > 0
        ? times.reduce((sum, t) => sum + t, 0) / times.length
        : 0;

    const eraSummary =
      messages.length === 0 ? "Stable performance" : messages.join(" | ");

    const history = getTrainingHistory();
    const record: TrainingHistoryItem = {
      date: new Date().toISOString(),
      PAI: pai ?? 0,
      accuracy,
      avgTime: avgTimeForRecord,
      trainingTimeLimit: STANDARD_TIME_SECONDS,
      ERA: eraSummary,
    };

    const role = getCurrentRole();
    const historyKey = getRoleScopedKey(HISTORY_KEY, role);
    window.localStorage.setItem(
      historyKey,
      JSON.stringify([...history, record])
    );

    // Студент профиліне осы сессияны қосу (тек студент рөлі үшін)
    if (role === "student") {
      const sessionRecord: StudentSessionRecord = {
        date: record.date,
        PAI: record.PAI,
        accuracy: record.accuracy,
        avgTime: record.avgTime,
        trainingTimeLimit: record.trainingTimeLimit,
        ERA: record.ERA,
      };
      appendSessionToStudentProfile(sessionRecord);
    }

    // Store weak topic for topic-based adaptive reinforcement
    if (weakTopic && stats.grade != null) {
      const weakInfo = {
        grade: stats.grade,
        topic: weakTopic,
      };
      const role = getCurrentRole();
      const weakKey = getRoleScopedKey(WEAK_TOPIC_KEY, role);
      window.localStorage.setItem(weakKey, JSON.stringify(weakInfo));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, pai, accuracy]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800 dark:bg-[#0f172a] dark:text-slate-200">
      <main className="flex flex-1 flex-col items-center px-6 py-12">
        <div className="w-full max-w-md">
          <h1 className="mb-10 text-center font-mono text-xl font-semibold text-slate-800 dark:text-white">
            Нәтиже
          </h1>

          {/* PAI score */}
          <div className="mb-10 text-center">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Қысым индексі (PAI)
            </div>
            <div className="pai-glow mt-1 font-mono text-7xl font-bold tabular-nums text-slate-800 dark:text-white">
              {pai !== null ? pai : "—"}
            </div>
            <div className="mt-4 h-6 text-xs">
              {paiTrend === "up" && (
                <div className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[0.7rem] font-medium text-emerald-300 transition-opacity duration-300">
                  <span className="mr-1 text-sm leading-none">↑</span>
                  <span>PAI жақсарды</span>
                </div>
              )}
              {paiTrend === "down" && (
                <div className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[0.7rem] font-medium text-amber-300 transition-opacity duration-300">
                  <span className="mr-1 text-sm leading-none">!</span>
                  <span>PAI төмендеді</span>
                </div>
              )}
            </div>
          </div>

          {/* ERA analysis */}
          <div className="mb-10 rounded-lg border border-slate-300 bg-slate-100/80 px-4 py-3 text-sm text-slate-700 dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-300">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              ERA талдауы
            </div>
            {messages.length === 0 ? (
              <p>Тұрақты орындау, айқын ERA ескертулері жоқ.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-5">
                {messages.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Weak topic message */}
          {weakTopic && (
            <div className="mb-6 rounded-lg border border-slate-300 bg-slate-100/80 px-4 py-3 text-sm text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300">
              {`Әлсіз бөлім анықталды: ${weakTopic}. Келесі жаттығуда күшейтілді.`}
            </div>
          )}

          {/* Adaptive difficulty message */}
          {adaptiveMessage && (
            <div className="mb-6 rounded-lg border border-slate-300 bg-slate-100/80 px-4 py-3 text-sm text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300">
              {adaptiveMessage}
            </div>
          )}

          {/* Stats */}
          <div className="space-y-3">
            <ResultRow label="Жалпы сұрақ" value={total} />
            <ResultRow label="Дұрыс" value={correct} />
            <ResultRow label="Қате" value={wrong} />
            <ResultRow label="Дұрыстық пайызы" value={`${accuracy}%`} />
            <ResultRow label="Макс. серия" value={maxStreak} />
          </div>

          {/* Review wrong questions */}
          {wrong > 0 && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => router.push("/review")}
                className="rounded-lg border border-slate-300 bg-slate-200 px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800"
              >
                Қате сұрақтарды қайта қарау
              </button>
            </div>
          )}

          <div className="mt-10 flex justify-center">
            <Link
              href="/"
              className="rounded-lg border border-slate-300 bg-slate-200 px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800"
            >
              Дашбордқа оралу
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function ResultRow({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-slate-100/80 px-4 py-3 dark:border-slate-700/80 dark:bg-slate-800/40">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-mono text-lg font-medium tabular-nums text-slate-800 dark:text-white">
        {value}
      </span>
    </div>
  );
}
