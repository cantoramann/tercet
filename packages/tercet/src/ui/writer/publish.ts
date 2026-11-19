import type { Messages } from "../../i18n/index.js";

export type PublishError = keyof Messages["writer"]["errors"];
export type PublishResult = { ok: true; slug: string } | { ok: false; error: PublishError };

const KNOWN: readonly PublishError[] = ["unauthorized", "exists", "invalid", "too_long", "empty"];

/** Send a poem to `POST /api/poems`. The token goes in the Authorization header only, never in a URL. */
export async function publishPoem(token: string, title: string, content: string): Promise<PublishResult> {
  try {
    const response = await fetch("/api/poems", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title, content }),
      credentials: "omit",
      cache: "no-store",
    });
    const body = (await response.json().catch(() => ({}))) as { slug?: string; error?: string };
    if (response.ok && body.slug) return { ok: true, slug: body.slug };
    const error = KNOWN.find((known) => known === body.error) ?? "unknown";
    return { ok: false, error };
  } catch {
    return { ok: false, error: "unknown" };
  }
}
