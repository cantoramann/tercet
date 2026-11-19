import { Fragment } from "react";
import type { Snippet } from "../../search/index.js";

/** Text with `<mark>` around matched spans. Plain text only: no HTML is ever parsed. */
export default function Highlight({ snippet }: { snippet: Snippet }) {
  if (snippet.marks.length === 0) return snippet.text;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const [start, end] of snippet.marks) {
    if (start > cursor) parts.push(<Fragment key={`t${cursor}`}>{snippet.text.slice(cursor, start)}</Fragment>);
    parts.push(<mark key={`m${start}`}>{snippet.text.slice(start, end)}</mark>);
    cursor = end;
  }
  if (cursor < snippet.text.length) parts.push(<Fragment key={`t${cursor}`}>{snippet.text.slice(cursor)}</Fragment>);
  return parts;
}
