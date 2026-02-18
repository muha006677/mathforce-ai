"use client";

import { useEffect, useMemo, useState } from "react";
import { loadStudentProfile, type StudentProfile } from "@/components/studentProfile";
import { getCurrentRole, getRoleScopedKey } from "@/components/roleStorage";

const WEAK_TOPIC_KEY = "mathforce_weak_topic";

type WeakTopicInfo = {
  grade: number;
  topic: string;
};

function loadWeakTopic(): WeakTopicInfo | null {
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

export default function StudentReportPage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [weakTopic, setWeakTopic] = useState<WeakTopicInfo | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setProfile(loadStudentProfile());
    setWeakTopic(loadWeakTopic());
  }, []);

  const lastSession = profile?.history?.length
    ? profile.history[profile.history.length - 1]
    : null;

  const avgPAI = useMemo(() => {
    if (!profile || !profile.history.length) return null;
    const sum = profile.history.reduce((acc, s) => acc + (s.PAI ?? 0), 0);
    return Math.round(sum / profile.history.length);
  }, [profile]);

  const avgAccuracy = useMemo(() => {
    if (!profile || !profile.history.length) return null;
    const sum = profile.history.reduce((acc, s) => acc + (s.accuracy ?? 0), 0);
    return Math.round(sum / profile.history.length);
  }, [profile]);

  const stabilityIndex = useMemo(() => {
    if (!profile || !profile.history.length) return "—";
    const unstableCount = profile.history.filter((s) =>
      s.ERA.toLowerCase().includes("pressure instability")
    ).length;
    const total = profile.history.length;
    if (unstableCount === 0) return "Тұрақты";
    if (unstableCount / total > 0.5) return "Тұрақсыз";
    return "Аралас";
  }, [profile]);

  const eraSummary = useMemo(() => {
    if (!profile || !profile.history.length) return "ERA есебі жоқ.";
    // Соңғы сессияның ERA мәтіні ең өзекті
    return lastSession?.ERA ?? "ERA есебі жоқ.";
  }, [profile, lastSession]);

  const recommendations = useMemo(() => {
    const out: string[] = [];
    const pai = avgPAI ?? 0;
    const acc = avgAccuracy ?? 0;
    const era = eraSummary ?? "";
    const eraLower = era.toLowerCase();

    if (pai >= 80 && acc >= 80) {
      out.push(
        "Жалпы нәтиже жоғары. Қиынырақ деңгейдегі есептерге және олимпиадалық форматқа біртіндеп өту ұсынылады."
      );
    } else if (acc < 60) {
      out.push(
        "Негізгі тақырыптар бойынша түсінікті күшейту үшін базалық есептерді жиі қайталау қажет."
      );
    } else {
      out.push(
        "Жалпы жетістік орташа деңгейде. Күрделілікті баяу арттыра отырып, әлсіз тақырыптарға қосымша уақыт бөлген дұрыс."
      );
    }

    if (eraLower.includes("careless mistakes")) {
      out.push(
        "Ұқыпсыз қателерді азайту үшін есепті жібермес бұрын қысқа тексеру чек-листін қолдану ұсынылады."
      );
    }

    if (eraLower.includes("knowledge gap detected")) {
      out.push(
        "Бірнеше рет қатарынан қателер болған тақырыптарда теорияны қайта қарап, қарапайымнан күрделіге қарай есептерді шешкен жөн."
      );
    }

    if (eraLower.includes("pressure instability")) {
      out.push(
        "Уақыт қысымында жауаптардың тұрақсыздығы байқалады. Таймермен жаттығу және уақытты бөлу стратегияларын қолдану маңызды."
      );
    }

    if (weakTopic) {
      out.push(
        `Әлсіз тақырып: «${weakTopic.topic}» (${weakTopic.grade}-сынып). Осы бөлім бойынша жеке жаттығу сессияларын жоспарлаған дұрыс.`
      );
    }

    return out;
  }, [avgPAI, avgAccuracy, eraSummary, weakTopic]);

  const handlePrint = () => {
    if (typeof window === "undefined") return;
    window.print();
  };

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 text-slate-800 dark:bg-[#0f172a] dark:text-slate-200">
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Студент профилі табылмады. Алдымен жаттығу сессиясын орындаңыз.
        </p>
      </div>
    );
  }

  const reportDate = lastSession
    ? new Date(lastSession.date).toLocaleDateString("kk-KZ", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : new Date().toLocaleDateString("kk-KZ", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-100 text-slate-800 dark:bg-[#020617] dark:text-slate-100">
      <div className="my-8 w-full max-w-3xl rounded-xl border border-slate-300 bg-white px-8 py-8 shadow-sm print:border-none print:bg-white dark:border-slate-700 dark:bg-slate-900">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-700">
          <div>
            <h1 className="text-lg font-semibold uppercase tracking-[0.18em] text-slate-700 dark:text-slate-100">
              Студент есебі
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              StudentProfile негізінде автоматты түрде генерацияланды.
            </p>
          </div>
          <div className="text-right text-[0.7rem] text-slate-500 dark:text-slate-400">
            <div>Күні: {reportDate}</div>
          </div>
        </header>

        {/* Негізгі ақпарат */}
        <section className="mb-5 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <div className="space-y-1">
            <div className="text-[0.7rem] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Студент
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
              {profile.name}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[0.7rem] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Сынып
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
              {profile.grade ?? "—"}
            </div>
          </div>
        </section>

        {/* Негізгі көрсеткіштер */}
        <section className="mb-6 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="text-[0.7rem] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Орташа PAI
            </div>
            <div className="mt-2 font-mono text-3xl tabular-nums">
              {avgPAI ?? "—"}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="text-[0.7rem] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Орташа дұрыстық
            </div>
            <div className="mt-2 font-mono text-3xl tabular-nums">
              {avgAccuracy != null ? `${avgAccuracy}%` : "—"}
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

        {/* Әлсіз тақырып және ERA */}
        <section className="mb-6 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="mb-1 text-[0.7rem] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Әлсіз тақырып
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              {weakTopic
                ? `${weakTopic.topic} (${weakTopic.grade}-сынып)`
                : "Әлсіз тақырып анықталмаған."}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="mb-1 text-[0.7rem] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              ERA жиынтық есебі
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line">
              {eraSummary}
            </p>
          </div>
        </section>

        {/* Ұсыныстар */}
        <section className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
          <div className="mb-1 text-[0.7rem] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Жеке ұсыныстар
          </div>
          <ul className="list-disc space-y-1 pl-5 text-xs">
            {recommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </section>

        {/* Print button */}
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

