"use client";

import { useTercet } from "../context.js";
import { setTheme, useTheme, type Theme } from "./theme.js";

const ORDER: Theme[] = ["system", "light", "dark"];

/** One quiet button that cycles system → light → dark. */
export default function ThemeToggle() {
  const { m: t } = useTercet();
  const theme = useTheme();
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];

  return (
    <button
      type="button"
      className="footer-button"
      onClick={() => setTheme(next)}
      aria-label={`${t.theme.label}: ${t.theme[theme]}`}
      title={`${t.theme.label}: ${t.theme[theme]} → ${t.theme[next]}`}
      suppressHydrationWarning
    >
      <span aria-hidden="true">{t.theme[theme]}</span>
    </button>
  );
}
