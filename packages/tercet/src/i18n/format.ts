import type { DeepPartial, Plural } from "./types.js";

/** Replace `{name}` placeholders. Unknown names are left as they are. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}

const rules = new Map<string, Intl.PluralRules>();

export function plural(message: Plural, n: number, lang: string): string {
  if (typeof message === "string") return format(message, { n });
  let rule = rules.get(lang);
  if (!rule) rules.set(lang, (rule = new Intl.PluralRules(lang)));
  const form = rule.select(n) as keyof Exclude<Plural, string>;
  return format(message[form] ?? message.other, { n });
}

/** Deep-merge site overrides onto a base dictionary. Plural objects are replaced whole. */
export function mergeMessages<T extends object>(base: T, overrides: DeepPartial<T> | undefined): T {
  if (!overrides) return base;
  const isBranch = (value: unknown): value is object =>
    typeof value === "object" && value !== null && !("other" in value);
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(overrides as Record<string, unknown>)) {
    if (value === undefined) continue;
    const current = out[key];
    out[key] = isBranch(value) && isBranch(current) ? mergeMessages(current, value) : value;
  }
  return out as T;
}
