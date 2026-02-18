"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getRoleScopedKey } from "@/components/roleStorage";

type Role = "student" | "teacher";

const AUTH_KEY = "mathforce_auth";
const ROLE_KEY = "mathforce_role";
const STUDENT_NAME_KEY = "mathforce_student_name";

const GRADES = [5, 6, 7, 8, 9, 10, 11];

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [grade, setGrade] = useState<number>(9);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Аты-жөніңізді енгізіңіз.");
      return;
    }
    if (role === "student" && !grade) {
      setError("Сыныпты таңдаңыз.");
      return;
    }

    if (typeof window === "undefined") return;

    try {
      const auth = {
        name: name.trim(),
        role,
        grade: role === "student" ? grade : null,
      };
      // Негізгі аутентификация объектісі
      window.localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
      // Рөлді бөлек сақтау (бар инфрақұрылымға сәйкестік үшін)
      window.localStorage.setItem(ROLE_KEY, role);
      // Студент аты (рөлге байланған)
      const nameKey = getRoleScopedKey(STUDENT_NAME_KEY, role);
      window.localStorage.setItem(nameKey, auth.name);
    } catch {
      setError("Деректерді сақтау кезінде қате шықты.");
      return;
    }

    // Рөлге байланысты бағыттау
    if (role === "student") {
      router.push("/student/dashboard");
    } else {
      router.push("/teacher/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 text-slate-800 dark:bg-[#0f172a] dark:text-slate-200">
      <div className="w-full max-w-md rounded-xl border border-slate-300 bg-slate-100/80 px  -6 py-8 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/60">
        <h1 className="mb-2 text-center text-lg font-semibold">
          Платформаға кіру
        </h1>
        <p className="mb-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Рөлді, атыңызды және (қажет болса) сыныпты таңдаңыз.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5 text-sm">
          {/* Аты-жөні */}
          <div className="space-y-1">
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Аты-жөні
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200 dark:focus:border-[#3b82f6] dark:focus:ring-[#3b82f6]"
              placeholder="Оқушының немесе мұғалімнің аты"
            />
          </div>

          {/* Рөл таңдау */}
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Рөлі
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRole("student")}
                className={`flex-1 rounded-md border px-3 py-2 transition-colors ${
                  role === "student"
                    ? "border-blue-600 bg-blue-600 text-white dark:border-[#3b82f6] dark:bg-[#3b82f6]"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-500"
                }`}
              >
                Оқушы
              </button>
              <button
                type="button"
                onClick={() => setRole("teacher")}
                className={`flex-1 rounded-md border px-3 py-2 transition-colors ${
                  role === "teacher"
                    ? "border-blue-600 bg-blue-600 text-white dark:border-[#3b82f6] dark:bg-[#3b82f6]"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-500"
                }`}
              >
                Мұғалім
              </button>
            </div>
          </div>

          {/* Сынып (тек оқушы үшін) */}
          {role === "student" && (
            <div className="space-y-1">
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Сынып
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200 dark:focus:border-[#3b82f6] dark:focus:ring-[#3b82f6]"
              >
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Қате хабарламасы */}
          {error && (
            <p className="text-xs text-red-500">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="mt-2 w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-[#3b82f6] dark:hover:bg-blue-600"
          >
            Кіру
          </button>
        </form>
      </div>
    </div>
  );
}

