import { defaultTheme } from "./defaults.js";
import type { Palette, ResolvedTheme, ThemeConfig } from "./types.js";

/** Palette key → CSS custom property used by the stylesheet. */
const TOKENS: Record<keyof Palette, string> = {
  background: "--bg",
  text: "--fg",
  muted: "--muted",
  faint: "--faint",
  border: "--border",
  highlight: "--mark",
  selection: "--selection",
};

// Values end up inside a <style> element, so only characters that can appear
// in a colour or a font list are allowed. Braces, semicolons, angle brackets
// and backslashes can never break out of the declaration.
const SAFE_COLOR = /^[#(),.%\w\s/+-]{1,64}$/;
const SAFE_FONT = /^[\p{L}\p{N}\s,'"._-]{1,200}$/u;

export class ThemeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ThemeError";
  }
}

function check(value: string, pattern: RegExp, what: string): string {
  const trimmed = value.trim();
  if (!pattern.test(trimmed)) throw new ThemeError(`Invalid ${what}: ${JSON.stringify(value)}`);
  return trimmed;
}

function palette(base: Palette, overrides: Partial<Palette> | undefined, scheme: string): Palette {
  const out = { ...base };
  for (const key of Object.keys(TOKENS) as (keyof Palette)[]) {
    const value = overrides?.[key];
    if (value !== undefined) out[key] = check(value, SAFE_COLOR, `theme.${scheme}.${key}`);
  }
  return out;
}

export function resolveTheme(theme: ThemeConfig | undefined): ResolvedTheme {
  return {
    light: palette(defaultTheme.light, theme?.light, "light"),
    dark: palette(defaultTheme.dark, theme?.dark, "dark"),
    font: theme?.font ? check(theme.font, SAFE_FONT, "theme.font") : defaultTheme.font,
  };
}

/**
 * Theme tokens as CSS. Wrapped in :where() so the rule has zero specificity:
 * any `:root { --bg: … }` in a site's own stylesheet wins, whatever the load order.
 */
export function themeCss(theme: ResolvedTheme): string {
  const declarations = (Object.keys(TOKENS) as (keyof Palette)[]).map(
    (key) => `${TOKENS[key]}:light-dark(${theme.light[key]},${theme.dark[key]})`,
  );
  declarations.push(`--tercet-font-stack:${theme.font}`);
  return `:where(:root){${declarations.join(";")}}`;
}
