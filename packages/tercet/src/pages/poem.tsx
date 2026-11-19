import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { firstLine, truncate } from "../poems/text.js";
import BackLink from "../ui/common/BackLink.js";
import PoemNav from "../ui/poem/PoemNav.js";
import Verses from "../ui/poem/Verses.js";
import type { Context } from "./types.js";

export interface PoemPageProps {
  params: Promise<{ slug: string }>;
}

export function createPoemPage({ site, data }: Context) {
  const t = site.messages;

  async function load(params: PoemPageProps["params"]) {
    const { slug } = await params;
    let decoded = slug;
    try {
      decoded = decodeURIComponent(slug);
    } catch {
      /* malformed escape: look it up as-is, which will not match */
    }
    return data.getPoemWithNeighbours(decoded);
  }

  async function generateStaticParams() {
    return (await data.listPoems()).map(({ slug }) => ({ slug }));
  }

  async function generateMetadata({ params }: PoemPageProps): Promise<Metadata> {
    const found = await load(params);
    if (!found) return {};
    const { poem } = found;
    const description = truncate(firstLine(poem.content), 150);
    return {
      title: poem.title,
      description,
      alternates: { canonical: `/poems/${poem.slug}` },
      openGraph: { type: "article", title: poem.title, description, publishedTime: poem.date },
    };
  }

  async function PoemPage({ params }: PoemPageProps) {
    const found = await load(params);
    if (!found) notFound();
    const { poem, previous, next } = found;

    return (
      <>
        <article className="poem rise">
          <BackLink text={t.back} label={t.backToAll} />
          <h1 className="poem-title">{poem.title}</h1>
          <Verses content={poem.content} />
        </article>
        <PoemNav
          messages={t}
          previous={previous && { slug: previous.slug, title: previous.title }}
          next={next && { slug: next.slug, title: next.title }}
        />
      </>
    );
  }

  return { Page: PoemPage, generateStaticParams, generateMetadata };
}
