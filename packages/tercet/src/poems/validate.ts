import type { PoemDraft } from "./types.js";

export const LIMITS = {
  title: 200,
  content: 50_000,
} as const;

export type DraftResult =
  | { ok: true; draft: Required<PoemDraft> }
  | { ok: false; error: "invalid" | "too_long" | "empty" };

// C0/C1 control characters except tab and newline, plus bidi overrides
// (U+202A–U+202E, U+2066–U+2069) that can visually disguise text.
const UNSAFE = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F‪-‮⁦-⁩]/g;

function clean(value: string): string {
  return value.replace(/\r\n?/g, "\n").replace(UNSAFE, "").normalize("NFC");
}

/** Validate untrusted input into a draft that is safe to encode and store. */
export function parseDraft(input: unknown, today = new Date()): DraftResult {
  if (typeof input !== "object" || input === null) return { ok: false, error: "invalid" };
  const { title, content } = input as Record<string, unknown>;
  if (typeof title !== "string" || typeof content !== "string") return { ok: false, error: "invalid" };

  const cleanTitle = clean(title).replace(/\s+/g, " ").trim();
  const cleanContent = clean(content).replace(/[ \t]+$/gm, "").trim();

  if (!cleanTitle || !cleanContent) return { ok: false, error: "empty" };
  if (cleanTitle.length > LIMITS.title || cleanContent.length > LIMITS.content) {
    return { ok: false, error: "too_long" };
  }

  return {
    ok: true,
    draft: { title: cleanTitle, content: cleanContent, date: today.toISOString().slice(0, 10) },
  };
}
