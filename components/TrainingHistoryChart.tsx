"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useTheme } from "@/components/ThemeProvider";
import { getCurrentRole, getRoleScopedKey } from "@/components/roleStorage";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const HISTORY_KEY = "mathforce_training_history";

type TrainingHistoryItem = {
  date: string;
  PAI: number;
  accuracy: number;
  avgTime: number;
  trainingTimeLimit: number;
  ERA: string;
};

export function TrainingHistoryChart() {
  const { isDark } = useTheme();
  const [history, setHistory] = useState<TrainingHistoryItem[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const role = getCurrentRole();
      const key = getRoleScopedKey(HISTORY_KEY, role);
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as TrainingHistoryItem[];
      setHistory(parsed);
    } catch {
      // ignore
    }
  }, []);

  const chartColors = useMemo(() => {
    if (isDark) {
      return {
        pai: "#3b82f6",
        accuracy: "#22c55e",
        stability: "#f97316",
        tooltipBg: "rgba(15,23,42,0.9)",
        tooltipBorder: "rgba(148,163,184,0.4)",
        tooltipText: "#e5e7eb",
        grid: "rgba(30,64,175,0.2)",
        ticks: "#9ca3af",
      };
    }
    return {
      pai: "#2563eb",
      accuracy: "#16a34a",
      stability: "#f97316",
      tooltipBg: "rgba(248,250,252,0.95)",
      tooltipBorder: "rgba(148,163,184,0.5)",
      tooltipText: "#1e293b",
      grid: "rgba(148,163,184,0.3)",
      ticks: "#1f2933",
    };
  }, [isDark]);

  const chartFont = {
    family: '"Times New Roman", Times, Georgia, serif',
    size: 11,
    weight: "600",
  };

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      plugins: {
        legend: {
          display: true,
          position: "top" as const,
          labels: {
            color: chartColors.ticks,
            font: chartFont,
          },
        },
        tooltip: {
          displayColors: true,
          backgroundColor: chartColors.tooltipBg,
          borderColor: chartColors.tooltipBorder,
          borderWidth: 1,
          titleColor: chartColors.tooltipText,
          bodyColor: chartColors.tooltipText,
          titleFont: chartFont,
          bodyFont: chartFont,
        },
      },
      scales: {
        x: {
          grid: { color: chartColors.grid },
          ticks: { color: chartColors.ticks, font: chartFont },
        },
        y: {
          grid: { color: chartColors.grid },
          ticks: { color: chartColors.ticks, font: chartFont },
          suggestedMin: 0,
          suggestedMax: 100,
        },
      },
    }),
    [chartColors]
  );

  const stabilitySeries = useMemo(
    () =>
      history.map((h) => {
        const era = h.ERA.toLowerCase();
        return era.includes("pressure instability") ? 40 : 100;
      }),
    [history]
  );

  const data = useMemo(
    () => ({
      labels: history.map((_, idx) => `#${idx + 1}`),
      datasets: [
        {
          label: "PAI",
          data: history.map((h) => h.PAI),
          borderColor: chartColors.pai,
          backgroundColor: chartColors.pai,
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 4,
          fill: false,
        },
        {
          label: "Дұрыстық (%)",
          data: history.map((h) => h.accuracy),
          borderColor: chartColors.accuracy,
          backgroundColor: chartColors.accuracy,
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 4,
          fill: false,
        },
        {
          label: "Тұрақтылық (шартты индекс)",
          data: stabilitySeries,
          borderColor: chartColors.stability,
          backgroundColor: chartColors.stability,
          borderDash: [4, 4],
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 4,
          fill: false,
        },
      ],
    }),
    [history, chartColors, stabilitySeries]
  );

  if (!history.length) {
    return (
      <div className="rounded-lg border border-slate-300 bg-slate-100/60 px-4 py-3 text-sm text-slate-500 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-400">
        Соңғы жаттығулар тарихы бос.
      </div>
    );
  }

  return (
    <div className="h-48 rounded-lg border border-slate-300 bg-slate-100/60 p-4 dark:border-slate-700/80 dark:bg-slate-900/40">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Жаттығу тарихы (PAI / дәлдік / тұрақтылық)
      </div>
      <Line data={data} options={options} />
    </div>
  );
}

