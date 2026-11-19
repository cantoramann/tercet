/**
 * URL-safe ASCII slug. Turkish letters are mapped explicitly (ı and İ have no
 * Unicode decomposition to i); every other accented Latin letter is handled
 * by NFKD decomposition, which drops the accent.
 */
const MAP: Record<string, string> = {
  ı: "i", İ: "i", ş: "s", Ş: "s", ğ: "g", Ğ: "g",
  ç: "c", Ç: "c", ö: "o", Ö: "o", ü: "u", Ü: "u",
  ß: "ss", æ: "ae", Æ: "ae", ø: "o", Ø: "o", œ: "oe", Œ: "oe", ł: "l", Ł: "l",
};

const MAX_LENGTH = 80;

export function slugify(input: string): string {
  return input
    .replace(/[ıİşŞğĞçÇöÖüÜßæÆøØœŒłŁ]/g, (c) => MAP[c])
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, MAX_LENGTH)
    .replace(/^-+|-+$/g, "");
}
