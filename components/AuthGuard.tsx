"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

const AUTH_KEY = "mathforce_auth";

type StoredAuth = {
  name?: string;
  role?: "student" | "teacher";
  grade?: number | null;
};

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // /login беті қорғаусыз
    if (pathname.startsWith("/login")) {
      setReady(true);
      return;
    }

    try {
      const raw = window.localStorage.getItem(AUTH_KEY);
      if (!raw) {
        router.replace("/login");
        return;
      }
      const parsed = JSON.parse(raw) as StoredAuth;
      if (parsed.role !== "student" && parsed.role !== "teacher") {
        router.replace("/login");
        return;
      }
      setReady(true);
    } catch {
      router.replace("/login");
    }
  }, [pathname, router]);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}

