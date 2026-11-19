/** Colours for one scheme (light or dark). Any CSS colour: hex, rgb(), hsl(), oklch(), named. */
export interface Palette {
  /** Page background. */
  background: string;
  /** Body text and headings. */
  text: string;
  /** Secondary text: excerpts, labels, the tagline. Keep 4.5:1 contrast with `background`. */
  muted: string;
  /** Decorative only (carets, separators); not used for text. */
  faint: string;
  /** Hairline rules between items. */
  border: string;
  /** Search match highlight. */
  highlight: string;
  /** Text selection. */
  selection: string;
}

export interface ThemeConfig {
  light?: Partial<Palette>;
  dark?: Partial<Palette>;
  /**
   * Font stack used when the site sets no `--tercet-font` (for example via
   * next/font), e.g. `'"Iowan Old Style", Palatino, Georgia, serif'`.
   */
  font?: string;
}

export interface ResolvedTheme {
  light: Palette;
  dark: Palette;
  font: string;
}
