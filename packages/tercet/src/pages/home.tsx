import SearchablePoems from "../ui/search/SearchablePoems.js";
import type { Context } from "./types.js";

export function createHomePage({ site, data }: Context) {
  return async function HomePage() {
    const poems = await data.listPoems();
    const docs = poems.map(({ slug, title, content }) => ({ slug, title, content }));

    return (
      <>
        <header className="intro rise">
          <h1>{site.title}</h1>
          {site.tagline.length > 0 && (
            <p className="tagline">
              {site.tagline.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </p>
          )}
        </header>
        <SearchablePoems docs={docs} />
      </>
    );
  };
}
