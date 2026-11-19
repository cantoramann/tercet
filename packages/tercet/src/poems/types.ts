export interface Poem {
  slug: string;
  title: string;
  /** ISO date (`YYYY-MM-DD`), when the source file has one. */
  date?: string;
  /** The poem's text: stanzas separated by blank lines. */
  content: string;
}

export type PoemDraft = Pick<Poem, "title" | "content"> & Partial<Pick<Poem, "date">>;

/**
 * Turns stored text into a poem and back. Implementations live in
 * `src/poems/codec/<name>/`; the frontmatter codec is the default.
 */
export interface PoemCodec {
  readonly name: string;
  /** File extensions this codec reads, most preferred first (used for new files). */
  readonly extensions: readonly string[];
  decode(slug: string, raw: string): Poem;
  encode(poem: Poem): string;
}
