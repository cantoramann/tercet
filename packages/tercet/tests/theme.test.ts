import { expect, test } from "bun:test";
import { resolveConfig } from "../src/config.js";
import { defaultTheme, resolveTheme, themeCss, ThemeError } from "../src/theme/index.js";

test("defaults when no theme is given", () => {
  expect(resolveTheme(undefined)).toEqual(defaultTheme);
});

test("partial palettes merge onto the defaults", () => {
  const theme = resolveTheme({ light: { background: "#fff" }, dark: { text: "oklch(90% 0.02 80)" }, font: "Iowan Old Style, serif" });
  expect(theme.light.background).toBe("#fff");
  expect(theme.light.text).toBe(defaultTheme.light.text);
  expect(theme.dark.text).toBe("oklch(90% 0.02 80)");
  const css = themeCss(theme);
  expect(css.startsWith(":where(:root){")).toBe(true);
  expect(css).toContain("--bg:light-dark(#fff,#141210)");
  expect(css).toContain("--tercet-font-stack:Iowan Old Style, serif");
});

test("values that could break out of the style element are rejected", () => {
  for (const bad of ["red;}body{display:none", "</style><script>", "url(x)\\", "#fff}"]) {
    expect(() => resolveTheme({ light: { background: bad } })).toThrow(ThemeError);
  }
  expect(() => resolveTheme({ font: "Georgia; } * { color: red" })).toThrow(ThemeError);
  expect(resolveTheme({ font: '"Noto Serif JP", ヒラギノ明朝, serif' }).font).toContain("ヒラギノ明朝");
});

test("the browser bar follows the theme", () => {
  expect(resolveConfig({ title: "T", theme: { dark: { background: "#000" } } }).theme.dark.background).toBe("#000");
});
