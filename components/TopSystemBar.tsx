"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { loadStudentProfile } from "@/components/studentProfile";
import { getCurrentRole } from "@/components/roleStorage";

const STATS_KEY = "mathforce_train_stats";
const STANDARD_TIME_SECONDS = 180;

type StoredStats = {
  totalQuestions: number;
  correctCount: number;
  maxStreak: number;
  totalTimeUsed?: number;
  difficulty?: number;
  grade?: number;
};

function calculatePAI(stats: StoredStats | null): number | null {
  if (!stats) return null;
  const { totalQuestions, correctCount, maxStreak, totalTimeUsed } = stats;
  if (!totalQuestions || !totalTimeUsed || totalTimeUsed <= 0) return null;

  const A = (correctCount / totalQuestions) * 100;
  let T = (STANDARD_TIME_SECONDS / totalTimeUsed) * 100;
  if (T > 100) T = 100;
  const S = (maxStreak / totalQuestions) * 100;

  const PAI = A * 0.5 + T * 0.3 + S * 0.2;
  return Math.round(PAI);
}

export function TopSystemBar() {
  const { theme, setTheme } = useTheme();
  const [grade, setGrade] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [pressureStage, setPressureStage] = useState<number | null>(null);
  const [pai, setPai] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>("Қолданушы");
  const [userGrade, setUserGrade] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(STATS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredStats;
        setGrade(parsed.grade ?? null);
        setDifficulty(parsed.difficulty ?? null);
        setPai(calculatePAI(parsed));
      }
      const stageRaw = window.sessionStorage.getItem("mathforce_pressure_stage");
      if (stageRaw != null) {
        const n = Number(stageRaw);
        setPressureStage(Number.isFinite(n) ? n : null);
      }

      // User identity: алдымен StudentProfile, болмаса auth
      const profile = loadStudentProfile();
      if (profile) {
        setUserName(profile.name || "Қолданушы");
        setUserGrade(profile.grade ?? null);
      } else {
        const rawAuth = window.localStorage.getItem("mathforce_auth");
        if (rawAuth) {
          const parsed = JSON.parse(rawAuth) as {
            name?: string;
            grade?: number | null;
          };
          setUserName(parsed.name?.trim() || "Қолданушы");
          setUserGrade(parsed.grade ?? null);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const displayGrade =
    userGrade != null ? `${userGrade}-сынып` : "— сынып";

  const handleProfileClick = () => {
    const role = getCurrentRole();
    if (role === "teacher") {
      router.push("/teacher/dashboard");
    } else {
      router.push("/student/dashboard");
    }
    setMenuOpen(false);
  };

  const handleSettingsClick = () => {
    router.push("/settings");
    setMenuOpen(false);
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.clear();
    }
    setMenuOpen(false);
    router.push("/login");
  };

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-slate-300 px-6 py-2.5 text-xs dark:border-slate-700/50">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-slate-500 dark:text-slate-400">
        <div className="flex items-baseline gap-1">
          <span className="uppercase tracking-wide text-[0.68rem] text-slate-500">
            Сынып
          </span>
          <span className="font-mono text-slate-700 dark:text-slate-200">
            {grade ?? "—"}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="uppercase tracking-wide text-[0.68rem] text-slate-500">
            Қиындық деңгейі
          </span>
          <span className="font-mono text-slate-700 dark:text-slate-200">
            {difficulty ?? "—"}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="uppercase tracking-wide text-[0.68rem] text-slate-500">
            Қысым кезеңі
          </span>
          <span className="font-mono text-slate-700 dark:text-slate-200">
            {pressureStage ?? "—"}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="uppercase tracking-wide text-[0.68rem] text-slate-500">
            PAI индексі
          </span>
          <span className="font-mono text-slate-700 dark:text-slate-200">
            {pai ?? "—"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-slate-100/80 px-3 py-1.5 text-[0.7rem] font-medium text-slate-700 transition-colors hover:bg-slate-200/80 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-700/60"
          >
            <span aria-hidden>👤</span>
            <span className="truncate max-w-[7rem]">{userName}</span>
            <span className="text-[0.65rem] text-slate-500 dark:text-slate-400">
              | {displayGrade}
            </span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-30 mt-1 w-44 rounded-md border border-slate-200 bg-slate-50 py-1 text-[0.7rem] shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onClick={handleProfileClick}
                className="block w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Жеке кабинет
              </button>
              <button
                type="button"
                onClick={handleSettingsClick}
                className="block w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Параметрлер
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-slate-200 dark:text-red-400 dark:hover:bg-slate-800"
              >
                Шығу
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="inline-flex min-w-[11rem] items-center justify-center gap-2 rounded-md border border-slate-300 bg-slate-100/80 px-3 py-1.5 text-[0.7rem] font-medium text-slate-600 transition-colors hover:bg-slate-200/80 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-700/60"
          aria-label={theme === "dark" ? "Күндізгі режимге өту" : "Қараңғы режимге өту"}
        >
          {theme === "dark" ? (
            <>
              <span aria-hidden>☀️</span>
              <span>Күндізгі режим</span>
            </>
          ) : (
            <>
              <span aria-hidden>🌙</span>
              <span>Қараңғы режим</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}

