import type { Metadata } from "next";
import { connection } from "next/server";
import { configuredToken } from "../security/token.js";
import PoemWriter from "../ui/writer/PoemWriter.js";
import type { Context } from "./types.js";

export function createWritePage({ site }: Context) {
  const metadata: Metadata = {
    title: site.messages.writer.pageTitle,
    description: site.messages.writer.pageDescription,
    robots: { index: false, follow: false },
  };

  async function WritePage() {
    // Rendered per request so turning publishing on or off needs no rebuild.
    await connection();
    return <PoemWriter canPublish={configuredToken(process.env) !== null} />;
  }

  return { Page: WritePage, metadata };
}
