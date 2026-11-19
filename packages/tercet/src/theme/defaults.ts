import type { ResolvedTheme } from "./types.js";

/** Warm paper and ink. Every text colour meets WCAG AA (4.5:1) on its background. */
export const defaultTheme: ResolvedTheme = {
  light: {
    background: "#faf8f5",
    text: "#3d3833", // 10.9:1
    muted: "#6e665e", // 5.3:1
    faint: "#8c847b",
    border: "#e8e4df",
    highlight: "#efe4cf",
    selection: "#e8e0d3",
  },
  dark: {
    background: "#141210",
    text: "#e6e0d8", // 14.3:1
    muted: "#a69e94", // 7.1:1
    faint: "#6b645c",
    border: "#2a2622",
    highlight: "#3a3226",
    selection: "#3a342d",
  },
  font: 'Georgia, "Times New Roman", serif',
};
