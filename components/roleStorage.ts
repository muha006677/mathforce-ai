"use client";

export type UserRole = "student" | "teacher";

const ROLE_KEY = "mathforce_role";

export function getCurrentRole(): UserRole | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(ROLE_KEY);
  return v === "student" || v === "teacher" ? v : null;
}

export function getRoleScopedKey(baseKey: string, role: UserRole | null) {
  return role ? `${baseKey}_${role}` : baseKey;
}

