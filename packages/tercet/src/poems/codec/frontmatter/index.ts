import type { PoemCodec } from "../../types.js";

/**
 * Markdown with a frontmatter block:
 *
 *   ---
 *   title: "İlk Kar"
 *   date: "2024-01-01"
 *   ---
 *
 *   Kar yağdı sessizce,
 *
 * This parser reads `key: value` pairs and nothing else. General YAML parsers
 * (and gray-matter, which this replaces) support custom tags or even `---js`
 * blocks that run code, which is unsafe for content pulled from a bucket.
 * Here text stays text.
 */

const FENCE = /^---[ \t]*\n(?:([\s\S]*?)\n)?---[ \t]*(?:\n|$)/;
const PAIR = /^([A-Za-z][\w-]*)[ \t]*:[ \t]*(.*)$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const text = raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const match = FENCE.exec(text);
  if (!match) return { data: {}, body: text };

  const data: Record<string, string> = Object.create(null);
  for (const line of (match[1] ?? "").split("\n")) {
    const pair = PAIR.exec(line.trim());
    if (pair) data[pair[1]] = unquote(pair[2].trim());
  }
  return { data, body: text.slice(match[0].length) };
}

function unquote(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (typeof parsed === "string") return parsed;
    } catch {
      /* fall through to a plain strip */
    }
    return value.slice(1, -1);
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  return value;
}

export const frontmatterCodec: PoemCodec = {
  name: "frontmatter",
  extensions: [".mdx", ".md"],

  decode(slug, raw) {
    const { data, body } = parseFrontmatter(raw);
    const date = data.date?.slice(0, 10);
    return {
      slug,
      title: data.title?.trim() || slug,
      date: date && ISO_DATE.test(date) ? date : undefined,
      content: body.trim(),
    };
  },

  encode({ title, date, content }) {
    // JSON strings are valid YAML double-quoted scalars, so quotes, colons and
    // newlines in a title cannot break out of the field.
    const lines = ["---", `title: ${JSON.stringify(title)}`];
    if (date) lines.push(`date: ${JSON.stringify(date)}`);
    lines.push("---", "", content.trim(), "");
    return lines.join("\n");
  },
};
