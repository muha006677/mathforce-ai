"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { useTheme } from "@/components/ThemeProvider";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type StudentRecord = {
  name: string;
  grade: number;
  pai: number;
  weakestTopic: string;
  stabilityIndex: "Тұрақты" | "Тұрақсыз";
};

const mockStudents: StudentRecord[] = [
  { name: "Айдана", grade: 9, pai: 82, weakestTopic: "Функциялар", stabilityIndex: "Тұрақты" },
  { name: "Мирас", grade: 9, pai: 74, weakestTopic: "Ықтималдық", stabilityIndex: "Тұрақсыз" },
  { name: "Әсел", grade: 9, pai: 91, weakestTopic: "Тригонометрия", stabilityIndex: "Тұрақты" },
  { name: "Ержан", grade: 9, pai: 68, weakestTopic: "Квадраттық теңдеу", stabilityIndex: "Тұрақсыз" },
  { name: "Дана", grade: 9, pai: 79, weakestTopic: "Функциялар", stabilityIndex: "Тұрақты" },
  { name: "Нұржан", grade: 9, pai: 88, weakestTopic: "Логарифм", stabilityIndex: "Тұрақты" },
  { name: "Ілияс", grade: 9, pai: 63, weakestTopic: "Ықтималдық", stabilityIndex: "Тұрақсыз" },
  { name: "Сәуле", grade: 9, pai: 95, weakestTopic: "Қысым жағдайы", stabilityIndex: "Тұрақты" },
];

export default function TeacherDashboardPage() {
  const { isDark } = useTheme();

  const averagePAI = useMemo(() => {
    if (!mockStudents.length) return 0;
    const sum = mockStudents.reduce((acc, s) => acc + s.pai, 0);
    return Math.round(sum / mockStudents.length);
  }, []);

  const weakestTopicsSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of mockStudents) {
      counts[s.weakestTopic] = (counts[s.weakestTopic] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, []);

  const stabilityStats = useMemo(() => {
    let stable = 0;
    let unstable = 0;
    for (const s of mockStudents) {
      if (s.stabilityIndex === "Тұрақты") stable += 1;
      else unstable += 1;
    }
    const total = stable + unstable || 1;
    return {
      stable,
      unstable,
      stablePct: Math.round((stable / total) * 100),
      unstablePct: Math.round((unstable / total) * 100),
    };
  }, []);

  const chartColors = useMemo(() => {
    if (isDark) {
      return {
        bar: "#3b82f6",
        barAlt: "#22c55e",
        grid: "rgba(30,64,175,0.2)",
        ticks: "#e5e7eb",
      };
    }
    return {
      bar: "#2563eb",
      barAlt: "#16a34a",
      grid: "rgba(148,163,184,0.3)",
      ticks: "#1f2933",
    };
  }, [isDark]);

  const chartFont = {
    family: '"Times New Roman", Times, Georgia, serif',
    size: 11,
    weight: "600",
  };

  const rankingData = useMemo(
    () => ({
      labels: mockStudents
        .slice()
        .sort((a, b) => b.pai - a.pai)
        .map((s) => s.name),
      datasets: [
        {
          label: "PAI",
          data: mockStudents
            .slice()
            .sort((a, b) => b.pai - a.pai)
            .map((s) => s.pai),
          backgroundColor: chartColors.bar,
          borderRadius: 4,
          maxBarThickness: 32,
        },
      ],
    }),
    [chartColors.bar]
  );

  const rankingOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
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
    [chartColors, chartFont]
  );

  const topicData = useMemo(
    () => ({
      labels: weakestTopicsSummary.map(([topic]) => topic),
      datasets: [
        {
          label: "Оқушылар саны",
          data: weakestTopicsSummary.map(([, count]) => count),
          backgroundColor: chartColors.barAlt,
          borderRadius: 4,
          maxBarThickness: 28,
        },
      ],
    }),
    [weakestTopicsSummary, chartColors.barAlt]
  );

  const topicOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      indexAxis: "y" as const,
      scales: {
        x: {
          grid: { color: chartColors.grid },
          ticks: { color: chartColors.ticks, font: chartFont },
        },
        y: {
          grid: { color: chartColors.grid },
          ticks: { color: chartColors.ticks, font: chartFont },
        },
      },
    }),
    [chartColors, chartFont]
  );

  return (
    <div className="relative z-10 flex h-full w-full flex-col">
      {/* Жоғарғы аналитикалық блоктар */}
      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-300 bg-slate-100/80 px-4 py-3 text-sm text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Орташа PAI
          </div>
          <div className="mt-2 font-mono text-3xl tabular-nums">
            {averagePAI}
          </div>
          <p className="mt-1 text-[0.7rem] text-slate-500 dark:text-slate-400">
            Сынып бойынша жалпы қысым индексі.
          </p>
        </div>
        <div className="rounded-xl border border-slate-300 bg-slate-100/80 px-4 py-3 text-sm text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Оқушылар
          </div>
          <div className="mt-2 font-mono text-3xl tabular-nums">
            {mockStudents.length}
          </div>
          <p className="mt-1 text-[0.7rem] text-slate-500 dark:text-slate-400">
            Осы сыныптағы бақылаудағы оқушылар саны.
          </p>
        </div>
        <div className="rounded-xl border border-slate-300 bg-slate-100/80 px-4 py-3 text-sm text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Тұрақтылық индексі
          </div>
          <div className="mt-2 font-mono text-3xl tabular-nums">
            {stabilityStats.stablePct}%{" "}
            <span className="text-xs text-slate-500 dark:text-slate-400">
              тұрақты
            </span>
          </div>
          <p className="mt-1 text-[0.7rem] text-slate-500 dark:text-slate-400">
            {stabilityStats.unstable} оқушыда уақыт бойынша тұрақсыздық бар.
          </p>
        </div>
      </section>

      {/* Негізгі тор: сол жақта рейтинг, оң жақта әлсіз тақырыптар */}
      <section className="mb-6 grid flex-1 grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col rounded-xl border border-slate-300 bg-slate-100/80 p-4 dark:border-slate-700/80 dark:bg-slate-900/40">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Сынып рейтингі (PAI)
          </div>
          <div className="h-64">
            <Bar data={rankingData} options={rankingOptions} />
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-slate-300 bg-slate-100/80 p-4 dark:border-slate-700/80 dark:bg-slate-900/40">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Әлсіз тақырыптар (сынып бойынша)
          </div>
          <div className="h-64">
            <Bar data={topicData} options={topicOptions} />
          </div>
        </div>
      </section>

      {/* Студенттер тізімі + қысқаша әлсіз тақырыптар мен тұрақтылық */}
      <section className="mb-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-300 bg-slate-100/80 p-4 text-sm text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Оқушылар тізімі
          </div>
          <div className="max-h-64 space-y-1 overflow-auto pr-1 text-xs">
            {mockStudents
              .slice()
              .sort((a, b) => b.pai - a.pai)
              .map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-700 dark:bg-slate-800/60"
                >
                  <div className="flex flex-col">
                    <span>{s.name}</span>
                    <span className="text-[0.65rem] text-slate-500 dark:text-slate-400">
                      Әлсіз тақырып: {s.weakestTopic}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm tabular-nums">
                      {s.pai}
                    </div>
                    <div
                      className={`text-[0.65rem] ${
                        s.stabilityIndex === "Тұрақты"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {s.stabilityIndex}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-300 bg-slate-100/80 p-4 text-sm text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Әлсіз тақырыптар жиынтығы
          </div>
          <ul className="space-y-1 text-xs">
            {weakestTopicsSummary.map(([topic, count]) => (
              <li
                key={topic}
                className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-700 dark:bg-slate-800/60"
              >
                <span>{topic}</span>
                <span className="font-mono text-sm tabular-nums">
                  {count}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 text-[0.7rem] text-slate-500 dark:text-slate-400">
            Бұл тізім мұғалімге келесі сабақтарда қандай бөлімдерге ерекше
            назар аудару керегін көрсетеді.
          </div>
        </div>
      </section>
    </div>
  );
}

