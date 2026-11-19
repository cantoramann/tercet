import { useSyncExternalStore } from "react";

/**
 * The poem being written, kept in localStorage so a closed tab or a crash
 * loses nothing. It never leaves the device unless the writer publishes.
 */

export interface Draft {
  title: string;
  content: string;
  /** When the draft was last written to storage, or null if it was not. */
  savedAt: number | null;
}

const KEY = "tercet:draft";
const PERSIST_DELAY_MS = 500;
const EMPTY: Draft = { title: "", content: "", savedAt: null };

let current: Draft | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
/** Typing not yet written to storage. */
let pending = false;
const listeners = new Set<() => void>();

function load(): Draft {
  if (current) return current;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
    const { title, content } = (parsed ?? {}) as Record<string, unknown>;
    current =
      typeof title === "string" && typeof content === "string" ? { title, content, savedAt: Date.now() } : EMPTY;
  } catch {
    current = EMPTY;
  }
  return current;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function persist() {
  pending = false;
  const { title, content } = load();
  try {
    if (title || content) localStorage.setItem(KEY, JSON.stringify({ title, content }));
    else localStorage.removeItem(KEY);
    current = { ...load(), savedAt: Date.now() };
  } catch {
    /* storage full or unavailable: the draft still lives in memory */
  }
  emit();
}

export function updateDraft(patch: Partial<Pick<Draft, "title" | "content">>) {
  current = { ...load(), ...patch, savedAt: null };
  pending = true;
  emit();
  clearTimeout(timer);
  timer = setTimeout(persist, PERSIST_DELAY_MS);
}

/** Clear the draft, unless it changed since `sent` was taken (text typed while publishing survives). */
export function clearDraft(sent?: Pick<Draft, "title" | "content">) {
  const now = load();
  if (sent && (now.title !== sent.title || now.content !== sent.content)) return;
  clearTimeout(timer);
  pending = false;
  current = EMPTY;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab saved or cleared the draft: adopt its version, unless this tab has unsaved typing.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY && event.key !== null) return;
    if (pending) return;
    current = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useDraft(): Draft {
  return useSyncExternalStore(subscribe, load, () => EMPTY);
}
