import type { MetadataRoute } from "next";
import type { Context } from "./types.js";

export function createSitemap({ site, data }: Context) {
  return async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const poems = await data.listPoems();
    return [
      { url: `${site.siteUrl}/` },
      ...poems.map((poem) => ({ url: `${site.siteUrl}/poems/${poem.slug}`, lastModified: poem.date })),
    ];
  };
}

export function createRobots({ site }: Context) {
  return function robots(): MetadataRoute.Robots {
    return {
      rules: { userAgent: "*", allow: "/", disallow: ["/write", "/api/"] },
      sitemap: `${site.siteUrl}/sitemap.xml`,
    };
  };
}
