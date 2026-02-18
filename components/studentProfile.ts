"use client";

import { getCurrentRole, getRoleScopedKey, UserRole } from "@/components/roleStorage";

const PROFILE_KEY = "mathforce_student_profile";
const AUTH_KEY = "mathforce_auth";

export type StudentSessionRecord = {
  date: string;
  PAI: number;
  accuracy: number;
  avgTime: number;
  trainingTimeLimit: number;
  ERA: string;
};

export type StudentProfile = {
  name: string;
  grade: number | null;
  role: UserRole;
  history: StudentSessionRecord[];
};

type StoredAuth = {
  name?: string;
  role?: UserRole;
  grade?: number | null;
};

function getAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function loadStudentProfile(): StudentProfile | null {
  if (typeof window === "undefined") return null;
  const role = getCurrentRole();
  if (!role) return null;
  const key = getRoleScopedKey(PROFILE_KEY, role);
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudentProfile;
    if (!parsed || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveStudentProfile(profile: StudentProfile) {
  if (typeof window === "undefined") return;
  const key = getRoleScopedKey(PROFILE_KEY, profile.role);
  try {
    window.localStorage.setItem(key, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

export function initStudentProfileIfNeeded(): StudentProfile | null {
  if (typeof window === "undefined") return null;
  const role = getCurrentRole();
  if (!role) return null;
  const existing = loadStudentProfile();
  if (existing) return existing;

  const auth = getAuth();
  const profile: StudentProfile = {
    name: auth?.name?.trim() || "Студент",
    grade: auth?.grade ?? null,
    role: role,
    history: [],
  };
  saveStudentProfile(profile);
  return profile;
}

export function appendSessionToStudentProfile(session: StudentSessionRecord) {
  if (typeof window === "undefined") return;
  const role = getCurrentRole();
  if (!role) return;

  const existing = loadStudentProfile() ?? initStudentProfileIfNeeded();
  if (!existing) return;

  const updated: StudentProfile = {
    ...existing,
    history: [...(existing.history ?? []), session],
  };
  saveStudentProfile(updated);
}

