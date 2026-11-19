import Link from "next/link";
import type { Hit } from "../../search/index.js";
import Highlight from "../common/Highlight.js";

interface Props {
  id: string;
  hits: Hit[];
  label: string;
  /** Results update on every keystroke while searching, so skip the entrance animation. */
  instant?: boolean;
}

export default function PoemList({ id, hits, label, instant = false }: Props) {
  return (
    <nav aria-label={label}>
      <ol id={id} className={instant ? "poem-list instant" : "poem-list"}>
        {hits.map((hit, i) => (
          <li key={hit.doc.slug} style={{ "--i": i } as React.CSSProperties}>
            <Link href={`/poems/${hit.doc.slug}`} className="poem-link">
              <span className="poem-link-title">
                <Highlight snippet={hit.title} />
              </span>
              {hit.excerpt.text && (
                <span className="poem-link-excerpt">
                  <Highlight snippet={hit.excerpt} />
                </span>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
