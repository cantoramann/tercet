/** Pure text helpers shared by server and client. Keep this file dependency-free. */

/** Stanzas (blank-line separated), each as trimmed lines. */
export function toStanzas(content: string): string[][] {
  return content
    .replace(/\r\n?/g, "\n")
    .split(/\n(?:[ \t]*\n)+/)
    .map((stanza) => stanza.split("\n").map((line) => line.trim()))
    .filter((lines) => lines.some(Boolean));
}

export function firstLine(content: string): string {
  return content.split("\n").find((line) => line.trim())?.trim() ?? "";
}

/** Cut at a word boundary, adding an ellipsis when shortened. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:!?—-]+$/, "")}…`;
}

export function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu)?.length ?? 0;
}

export function countLines(text: string): number {
  return text.split("\n").filter((line) => line.trim()).length;
}
