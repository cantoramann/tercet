import { firstLine, truncate } from "../poems/text.js";
import { foldWithMap, toOriginalSpan, tokenize, type Folded } from "./fold.js";

export { fold, tokenize } from "./fold.js";

/** What the client needs per poem. Kept small: it is serialized into the page. */
export interface SearchDoc {
  slug: string;
  title: string;
  content: string;
}

export interface Snippet {
  text: string;
  /** Highlighted `[start, end)` spans within `text`. */
  marks: [number, number][];
}

export interface Hit {
  doc: SearchDoc;
  title: Snippet;
  excerpt: Snippet;
}

interface Indexed {
  doc: SearchDoc;
  title: Folded;
  lines: { raw: string; folded: Folded }[];
}

const EXCERPT_LENGTH = 72;

/**
 * In-memory search over a small collection. Every query token must appear in
 * the title or the text (AND semantics). Hits whose title matches rank first;
 * otherwise collection order is kept.
 */
export function createSearchIndex(docs: readonly SearchDoc[]) {
  let indexed: Indexed[] | undefined;
  // Built on first search, so pages that are only browsed never pay for it.
  const build = () =>
    (indexed ??= docs.map((doc) => ({
      doc,
      title: foldWithMap(doc.title),
      lines: doc.content
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((raw) => ({ raw, folded: foldWithMap(raw) })),
    })));

  return {
    search(query: string): Hit[] {
      const tokens = tokenize(query);
      if (tokens.length === 0) return docs.map(browse);

      const hits: { hit: Hit; titleScore: number }[] = [];
      for (const entry of build()) {
        let titleScore = 0;
        const matched = tokens.every((token) => {
          if (entry.title.text.includes(token)) {
            titleScore++;
            return true;
          }
          return entry.lines.some((line) => line.folded.text.includes(token));
        });
        if (!matched) continue;

        const line = entry.lines.find((l) => tokens.some((t) => l.folded.text.includes(t))) ?? entry.lines[0];
        hits.push({
          titleScore,
          hit: {
            doc: entry.doc,
            title: { text: entry.doc.title, marks: spans(entry.title, tokens) },
            excerpt: line ? excerptAround(line.raw, line.folded, tokens) : { text: "", marks: [] },
          },
        });
      }
      // Array.prototype.sort is stable, so ties keep collection order.
      return hits.sort((a, b) => b.titleScore - a.titleScore).map((h) => h.hit);
    },
  };
}

function browse(doc: SearchDoc): Hit {
  return {
    doc,
    title: { text: doc.title, marks: [] },
    excerpt: { text: truncate(firstLine(doc.content), EXCERPT_LENGTH), marks: [] },
  };
}

function spans(folded: Folded, tokens: string[]): [number, number][] {
  const found: [number, number][] = [];
  for (const token of tokens) {
    let at = folded.text.indexOf(token);
    while (at !== -1) {
      found.push(toOriginalSpan(folded, at, at + token.length));
      at = folded.text.indexOf(token, at + token.length);
    }
  }
  return merge(found);
}

function merge(list: [number, number][]): [number, number][] {
  const sorted = [...list].sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const span of sorted) {
    const last = out.at(-1);
    if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
    else out.push([...span]);
  }
  return out;
}

/** A window of the line around its first match, with marks shifted into the window. */
function excerptAround(raw: string, folded: Folded, tokens: string[]): Snippet {
  const marks = spans(folded, tokens);
  if (raw.length <= EXCERPT_LENGTH) return { text: raw, marks };

  const first = marks[0]?.[0] ?? 0;
  let start = Math.max(0, first - Math.floor(EXCERPT_LENGTH / 3));
  if (start > 0) {
    const space = raw.indexOf(" ", start);
    start = space !== -1 && space < first ? space + 1 : start;
  }
  const end = Math.min(raw.length, start + EXCERPT_LENGTH);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < raw.length ? "…" : "";
  const shift = prefix.length - start;

  return {
    text: prefix + raw.slice(start, end) + suffix,
    marks: marks
      .filter(([s, e]) => e > start && s < end)
      .map(([s, e]) => [Math.max(s, start) + shift, Math.min(e, end) + shift]),
  };
}
