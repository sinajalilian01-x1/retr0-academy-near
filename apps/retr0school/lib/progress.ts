"use client";

import { useSyncExternalStore } from "react";
import type { ProgressState } from "@/lib/types";

export const PROGRESS_KEY = "w3h-progress-v1";
const EVENT = "w3h-progress";

const EMPTY: ProgressState = { lessons: [], quizzes: {} };

let cachedRaw: string | null = null;
let cachedState: ProgressState = EMPTY;

function parse(raw: string): ProgressState {
  try {
    const data = JSON.parse(raw) as {
      lessons?: unknown;
      quizzes?: unknown;
    };
    const lessons = Array.isArray(data.lessons)
      ? data.lessons.filter((item): item is string => typeof item === "string")
      : [];
    const quizzes: ProgressState["quizzes"] = {};
    if (data.quizzes && typeof data.quizzes === "object") {
      for (const [key, value] of Object.entries(data.quizzes as Record<string, unknown>)) {
        if (!value || typeof value !== "object") continue;
        const score = value as { correct?: unknown; total?: unknown };
        if (typeof score.correct === "number" && typeof score.total === "number") {
          quizzes[key] = { correct: score.correct, total: score.total };
        }
      }
    }
    return { lessons, quizzes };
  } catch {
    return EMPTY;
  }
}

function read(): ProgressState {
  const raw = localStorage.getItem(PROGRESS_KEY);
  const normalized = raw ?? "";
  if (normalized === cachedRaw) return cachedState;
  cachedRaw = normalized;
  cachedState = raw ? parse(raw) : EMPTY;
  return cachedState;
}

function emit(state: ProgressState) {
  const raw = JSON.stringify(state);
  localStorage.setItem(PROGRESS_KEY, raw);
  cachedRaw = raw;
  cachedState = state;
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(EVENT, onStoreChange);
  };
}

function getServerSnapshot() {
  return EMPTY;
}

export function useProgress() {
  return useSyncExternalStore(subscribe, read, getServerSnapshot);
}

export function lessonKey(track: string, slug: string) {
  return `${track}/${slug}`;
}

export function isLessonDone(state: ProgressState, track: string, slug: string) {
  return state.lessons.includes(lessonKey(track, slug));
}

export function trackPercent(state: ProgressState, track: string, slugs: string[]) {
  if (slugs.length === 0) return 0;
  const done = slugs.filter((slug) => isLessonDone(state, track, slug)).length;
  return Math.round((done / slugs.length) * 100);
}

export function toggleLesson(track: string, slug: string) {
  const current = read();
  const key = lessonKey(track, slug);
  const lessons = current.lessons.includes(key)
    ? current.lessons.filter((item) => item !== key)
    : [...current.lessons, key];
  emit({ ...current, lessons });
}

export function saveQuiz(track: string, correct: number, total: number) {
  const current = read();
  emit({
    ...current,
    quizzes: { ...current.quizzes, [track]: { correct, total } },
  });
}

export function clearProgress() {
  emit({ lessons: [], quizzes: {} });
}
