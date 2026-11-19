import BackLink from "../ui/common/BackLink.js";
import type { Context } from "./types.js";

export function createNotFoundPage({ site }: Context) {
  const t = site.messages;
  return function NotFound() {
    return (
      <section className="not-found rise">
        <BackLink text={t.back} label={t.backToAll} />
        <h1>{t.notFound.title}</h1>
        <p>{t.notFound.body}</p>
      </section>
    );
  };
}
