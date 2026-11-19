/**
 * Accent- and case-insensitive matching, so "cafe" finds "Café" and
 * "isik" finds "Işık".
 *
 * Text is folded one character at a time and an index map is kept, so a
 * match in the folded text maps back to the exact span of the original. That
 * is what lets the UI highlight what was matched.
 */

const SPECIAL: Record<string, string> = { ı: "i", İ: "i", ß: "ss", æ: "ae", Æ: "ae", œ: "oe", Œ: "oe", ø: "o", Ø: "o", ł: "l", Ł: "l" };

function foldChar(char: string): string {
  return (SPECIAL[char] ?? char).normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
}

export function fold(text: string): string {
  let out = "";
  for (const char of text) out += foldChar(char);
  return out;
}

export interface Folded {
  text: string;
  /** `starts[i]` is the index in the original string where folded character `i` came from. */
  starts: number[];
  /** Length of the original string, for spans that run to the end. */
  length: number;
}

export function foldWithMap(text: string): Folded {
  let out = "";
  const starts: number[] = [];
  let index = 0;
  for (const char of text) {
    const folded = foldChar(char);
    for (let i = 0; i < folded.length; i++) starts.push(index);
    out += folded;
    index += char.length;
  }
  return { text: out, starts, length: text.length };
}

/** Map a `[start, end)` span in folded text back to the original string. */
export function toOriginalSpan(folded: Folded, start: number, end: number): [number, number] {
  const from = folded.starts[start] ?? folded.length;
  let to = end < folded.starts.length ? folded.starts[end] : folded.length;
  // A match ending inside a character that folds to several (ß → ss, ﬁ → fi)
  // covers that whole character.
  if (to <= from) {
    let next = start;
    while (next < folded.starts.length && folded.starts[next] === from) next++;
    to = next < folded.starts.length ? folded.starts[next] : folded.length;
  }
  return [from, to];
}

export function tokenize(query: string): string[] {
  return fold(query).split(/\s+/).filter(Boolean);
}
