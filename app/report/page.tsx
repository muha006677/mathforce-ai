"use client";

import { useEffect, useMemo, useState } from "react";
import { getCurrentRole, getRoleScopedKey } from "@/components/roleStorage";

const HISTORY_KEY = "mathforce_training_history";
const WEAK_TOPIC_KEY = "mathforce_weak_topic";
const STUDENT_NAME_KEY = "mathforce_student_name";

type TrainingHistoryItem = {
  date: string;
  PAI: number;
  accuracy: number;
  avgTime: number;
  trainingTimeLimit: number;
  ERA: string;
};

type WeakTopicInfo = {
  grade: number;
  topic: string;
};

function getLastHistory(): TrainingHistoryItem | null {
  if (typeof window === "undefined") return null;
  try {
    const role = getCurrentRole();
    const key = getRoleScopedKey(HISTORY_KEY, role);
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const list = JSON.parse(raw) as TrainingHistoryItem[];
    if (!list.length) return null;
    return list[list.length - 1];
  } catch {
    return null;
  }
}

function getWeakTopic(): WeakTopicInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const role = getCurrentRole();
    const key = getRoleScopedKey(WEAK_TOPIC_KEY, role);
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as WeakTopicInfo;
  } catch {
    return null;
  }
}

function getStudentName(): string {
  if (typeof window === "undefined") return "Студент";
  try {
    const role = getCurrentRole();
    const key = getRoleScopedKey(STUDENT_NAME_KEY, role);
    const raw = window.localStorage.getItem(key);
    if (!raw) return "Студент";
    return raw;
  } catch {
    return "Студент";
  }
}

export default function PerformanceReportPage() {
  const [historyItem, setHistoryItem] = useState<TrainingHistoryItem | null>(
    null
  );
  const [weakTopic, setWeakTopic] = useState<WeakTopicInfo | null>(null);
  const [studentName, setStudentName] = useState<string>("Студент");

  useEffect(() => {
    setHistoryItem(getLastHistory());
    setWeakTopic(getWeakTopic());
    setStudentName(getStudentName());
  }, []);

  const reportDate = useMemo(
    () =>
      historyItem
        ? new Date(historyItem.date).toLocaleDateString("kk-KZ", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
        : new Date().toLocaleDateString("kk-KZ", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }),
    [historyItem]
  );

  const stabilityIndex = useMemo(() => {
    const era = historyItem?.ERA ?? "";
    if (era.toLowerCase().includes("pressure instability")) {
      return "Тұрақсыз";
    }
    return "Тұрақты";
  }, [historyItem]);

  const recommendations = useMemo(() => {
    const out: string[] = [];
    const pai = historyItem?.PAI ?? 0;
    const acc = historyItem?.accuracy ?? 0;
    const era = historyItem?.ERA ?? "";
    const eraLower = era.toLowerCase();

    if (pai >= 80 && acc >= 80) {
      out.push(
        "Жалпы нәтиже жоғары. Қиынырақ деңгейдегі есептерге біртіндеп өту ұсынылады."
      );
    } else if (acc < 60) {
      out.push(
        "Негізгі тақырыптарды қайта қарау және базалық есептерді көбірек қайталау қажет."
      );
    }

    if (eraLower.includes("careless mistakes")) {
      out.push(
        "Қате жауаптардың бір бөлігі ұқыпсыздықпен байланысты. Есепті жібермес бұрын шешімді қайта тексеру дағдысын күшейтіңіз."
      );
    }

    if (eraLower.includes("knowledge gap detected")) {
      out.push(
        "Бірнеше рет қатарынан қателер байқалды. Осы тақырып бойынша теорияны қайта оқып, мысалдарды біртіндеп талдаған жөн."
      );
    }

    if (eraLower.includes("pressure instability")) {
      out.push(
        "Уақыт қысымында тұрақсыздық бар. Таймермен жаттығуларды көбейту және уақытты бөлу стратегияларын қолдану ұсынылады."
      );
    }

    if (!out.length) {
      out.push(
        "Жаттығу нәтижелері тұрақты. Қазіргі оқу ырғағын сақтап, біртіндеп жаңа тақырыптарға өтуге болады."
      );
    }

    return out;
  }, [historyItem]);

  const gradeText = weakTopic?.grade ?? "—";
  const paiText =
    historyItem?.PAI !== undefined && historyItem?.PAI !== null
      ? historyItem.PAI
      : "—";
  const accuracyText =
    historyItem?.accuracy !== undefined && historyItem?.accuracy !== null
      ? `${historyItem.accuracy}%`
      : "—";
  const eraText = historyItem?.ERA ?? "ERA есебі жоқ.";

  const weakTopicText = weakTopic
    ? `${weakTopic.topic} (сынып: ${weakTopic.grade})`
    : "Әлсіз тақырып анықталмаған.";

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-100 text-slate-800 dark:bg-[#020617] dark:text-slate-100">
      <div className="my-8 w-full max-w-3xl rounded-xl border border-slate-300 bg-white px-8 py-8 shadow-sm print:border-none print:bg-white dark:border-slate-700 dark:bg-slate-900">
        {/* Заголовок */}
        <header className="mb-6 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-700">
          <div>
            <h1 className="text-lg font-semibold uppercase tracking-[0.18em] text-slate-700 dark:text-slate-100">
              Жеке оқу есебі
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              MathForce AI қысым индекстері негізінде автоматты түрде
              генерацияланды.
            </p>
          </div>
          <div className="text-right text-[0.7rem] text-slate-500 dark:text-slate-400">
            <div>Күні: {reportDate}</div>
          </div>
        </header>

        {/* Негізгі мәліметтер */}
        <section className="mb-5 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <div className="space-y-1">
            <div className="text-[0.7rem] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Студент
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
              {studentName}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[0.7rem] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Сынып
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
              {gradeText}
            </div>
          </div>
        </section>

        {/* Негізгі көрсеткіштер */}
        <section className="mb-6 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="text-[0.7rem] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              PAI индексі
            </div>
            <div className="mt-2 font-mono text-3xl tabular-nums">
              {paiText}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="text-[0.7rem] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Дұрыстық пайызы
            </div>
            <div className="mt-2 font-mono text-3xl tabular-nums">
              {accuracyText}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="text-[0.7rem] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Тұрақтылық индексі
            </div>
            <div className="mt-2 font-mono text-3xl tabular-nums">
              {stabilityIndex}
            </div>
          </div>
        </section>

        {/* Әлсіз тақырыптар және ERA */}
        <section className="mb-6 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="mb-1 text-[0.7rem] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Әлсіз тақырыптар
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              {weakTopicText}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="mb-1 text-[0.7rem] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              ERA жиынтық есебі
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line">
              {eraText}
            </p>
          </div>
        </section>

        {/* Ұсыныстар */}
        <section className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
          <div className="mb-1 text-[0.7rem] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Жақсарту бойынша ұсыныстар
          </div>
          <ul className="list-disc space-y-1 pl-5 text-xs">
            {recommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </section>

        {/* Басып шығару батырмасы (тек экранда) */}
        <div className="mt-4 flex justify-end print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-md border border-slate-300 bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Есепті басып шығару
          </button>
        </div>
      </div>
    </div>
  );
}

