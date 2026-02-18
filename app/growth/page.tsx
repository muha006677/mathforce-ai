"use client";

export default function GrowthPage() {
  return (
    <div className="relative z-10 flex flex-1 flex-col">
      <div className="mb-6">
        <h1 className="font-mono text-lg font-semibold tracking-tight text-slate-800 dark:text-white">
          Өсу динамикасы
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Жаттығу нәтижелері мен PAI динамикасы бұл бөлімде көрсетіледі.
        </p>
      </div>
      <div className="rounded-lg border border-slate-300 bg-slate-100/60 px-6 py-8 text-center text-sm text-slate-500 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-400">
        Өсу динамикасы графикасы жақында қосылады.
      </div>
    </div>
  );
}
