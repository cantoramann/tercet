import Link from "next/link";
import type { Messages } from "../../i18n/index.js";
import type { Poem } from "../../poems/types.js";
import ArrowKeys from "./ArrowKeys.js";

type Neighbour = Pick<Poem, "slug" | "title"> | null;

/** Previous / next poem, with ← and → as keyboard shortcuts. */
interface Props {
  previous: Neighbour;
  next: Neighbour;
  messages: Pick<Messages, "previous" | "next">;
}

export default function PoemNav({ previous, next, messages: t }: Props) {
  if (!previous && !next) return null;
  const href = (p: NonNullable<Neighbour>) => `/poems/${p.slug}`;

  return (
    <nav className="poem-nav" aria-label={`${t.previous} / ${t.next}`}>
      {previous && (
        <Link href={href(previous)} rel="prev" className="poem-nav-prev">
          <span className="label poem-nav-dir">← {t.previous}</span>
          <span className="poem-nav-title">{previous.title}</span>
        </Link>
      )}
      {next && (
        <Link href={href(next)} rel="next" className="poem-nav-next">
          <span className="label poem-nav-dir">{t.next} →</span>
          <span className="poem-nav-title">{next.title}</span>
        </Link>
      )}
      <ArrowKeys previous={previous && href(previous)} next={next && href(next)} />
    </nav>
  );
}
