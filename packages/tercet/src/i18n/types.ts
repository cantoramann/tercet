/**
 * A count-dependent message. A plain string applies to every count; an object
 * picks a form by the language's plural rules (Intl.PluralRules), falling back
 * to `other`. `{n}` is replaced with the count.
 */
export type Plural = string | { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string };

/**
 * Every user-facing string, as plain data so it can be serialized to the
 * browser and overridden per site. `{name}` placeholders are filled by `format`.
 */
export interface Messages {
  skipToContent: string;
  back: string;
  backToAll: string;
  previous: string;
  next: string;
  search: {
    label: string;
    placeholder: string;
    shortcutHint: string;
    clear: string;
    none: string;
    found: Plural;
    total: Plural;
  };
  theme: {
    label: string;
    system: string;
    light: string;
    dark: string;
  };
  writer: {
    pageTitle: string;
    pageDescription: string;
    titleLabel: string;
    titlePlaceholder: string;
    bodyLabel: string;
    bodyPlaceholder: string;
    download: string;
    downloadHint: string;
    publish: string;
    publishing: string;
    published: string;
    tokenLabel: string;
    clear: string;
    confirmClear: string;
    draftSaved: string;
    lines: Plural;
    words: Plural;
    errors: Record<"unauthorized" | "exists" | "invalid" | "too_long" | "empty" | "unknown", string>;
  };
  notFound: {
    title: string;
    body: string;
  };
}

/** Recursive partial, for site overrides. */
export type DeepPartial<T> = { [K in keyof T]?: T[K] extends string | readonly unknown[] ? T[K] : DeepPartial<T[K]> };
