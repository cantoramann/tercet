import { expect, test } from "bun:test";
import { slugify } from "../src/poems/slug.js";

test("Turkish letters fold to ASCII", () => {
  expect(slugify("Işıklı Şehir Ağı")).toBe("isikli-sehir-agi");
  expect(slugify("İlk Gün")).toBe("ilk-gun");
  expect(slugify("Çay - Deneme 2")).toBe("cay-deneme-2");
  expect(slugify("Âşık Veysel")).toBe("asik-veysel");
});

test("output is always a safe key", () => {
  for (const input of ["../../etc/passwd", "a/b\\c", "  --x--  ", "\u0000\u202Eevil", "💔"]) {
    expect(slugify(input)).toMatch(/^([a-z0-9]+(-[a-z0-9]+)*)?$/);
  }
  expect(slugify("x".repeat(500)).length).toBeLessThanOrEqual(80);
});
