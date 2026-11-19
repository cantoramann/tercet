import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { POEMS_TAG } from "../data.js";
import type { Context } from "../pages/types.js";
import { parseDraft } from "../poems/validate.js";
import { bearerToken, configuredToken, tokensMatch } from "../security/token.js";
import { BlobExistsError } from "../storage/index.js";

/** Largest accepted request body. Leaves room for JSON escaping of a maximum-size poem. */
const MAX_BODY_BYTES = 256 * 1024;

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

/** Route handlers for `/api/poems`: public JSON read, token-protected publish. */
export function createPoemsApi({ site, data }: Context) {
  /** Public read API: every poem as JSON. */
  async function GET() {
    const poems = await data.listPoems();
    return NextResponse.json(poems, {
      headers: {
        "Cache-Control": `public, s-maxage=${site.revalidate}, stale-while-revalidate=${Math.round(site.revalidate / 2)}`,
      },
    });
  }

  /**
   * Publish a poem. Disabled (404) unless `TERCET_WRITE_TOKEN` is set. Callers
   * authenticate with `Authorization: Bearer <token>`. The slug comes from the
   * title on the server, so clients never choose storage keys.
   */
  async function POST(request: Request) {
    const expected = configuredToken(process.env);
    if (!expected) return json({ error: "not_found" }, 404);

    const given = bearerToken(request.headers.get("authorization"));
    if (!given || !tokensMatch(given, expected)) {
      return json({ error: "unauthorized" }, 401, { "WWW-Authenticate": 'Bearer realm="poems"' });
    }

    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return json({ error: "unsupported_media_type" }, 415);
    }

    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > MAX_BODY_BYTES) return json({ error: "too_long" }, 413);

    const text = await readLimited(request, MAX_BODY_BYTES);
    if (text === null) return json({ error: "too_long" }, 413);

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return json({ error: "invalid" }, 400);
    }

    const result = parseDraft(body);
    if (!result.ok) return json({ error: result.error }, result.error === "too_long" ? 413 : 400);

    try {
      const poem = await data.repository().create(result.draft);
      revalidateTag(POEMS_TAG, "max");
      revalidatePath("/");
      revalidatePath(`/poems/${poem.slug}`);
      return json({ slug: poem.slug }, 201, { Location: `/poems/${poem.slug}` });
    } catch (error) {
      if (error instanceof BlobExistsError) return json({ error: "exists" }, 409);
      console.error("[poems] publish failed:", error);
      return json({ error: "unknown" }, 500);
    }
  }

  return { GET, POST };
}

/** Read the body without trusting Content-Length: stop as soon as the limit is passed. */
async function readLimited(request: Request, limit: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));
}
