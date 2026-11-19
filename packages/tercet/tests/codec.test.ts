import { describe, expect, test } from "bun:test";
import { frontmatterCodec, parseFrontmatter } from "../src/poems/codec/frontmatter/index.js";

describe("frontmatter codec", () => {
  test("decodes the standard format", () => {
    const poem = frontmatterCodec.decode("ilk-kar", '---\ntitle: "İlk Kar"\ndate: "2024-01-01"\n---\n\nKar yağdı sessizce,\n');
    expect(poem).toEqual({ slug: "ilk-kar", title: "İlk Kar", date: "2024-01-01", content: "Kar yağdı sessizce," });
  });

  test("round-trips titles that would break naive YAML", () => {
    const tricky = 'Bir "söz": ilk\\satır\n---\ninjected: yes';
    const encoded = frontmatterCodec.encode({ slug: "x", title: tricky, date: "2025-02-03", content: "dize" });
    const decoded = frontmatterCodec.decode("x", encoded);
    expect(decoded.title).toBe(tricky);
    expect(decoded.content).toBe("dize");
    expect(parseFrontmatter(encoded).data.injected).toBeUndefined();
  });

  test("never evaluates code: ---js blocks are plain text", () => {
    const raw = "---js\n{ title: (globalThis.pwned = 1, 'x') }\n---\nbody";
    const poem = frontmatterCodec.decode("js", raw);
    expect((globalThis as Record<string, unknown>).pwned).toBeUndefined();
    expect(poem.title).toBe("js");
  });

  test("ignores prototype keys", () => {
    const { data } = parseFrontmatter("---\n__proto__: polluted\nconstructor: x\n---\n");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(data)).toBeNull();
  });

  test("handles CRLF, BOM, single quotes, bare values and bad dates", () => {
    const poem = frontmatterCodec.decode("a", "\uFEFF---\r\ntitle: 'It''s'\r\ndate: soon\r\n---\r\nline\r\n");
    expect(poem).toEqual({ slug: "a", title: "It's", date: undefined, content: "line" });
    expect(frontmatterCodec.decode("b", "---\ntitle: Bare: colon\n---\nx").title).toBe("Bare: colon");
  });

  test("an empty frontmatter block is removed", () => {
    expect(frontmatterCodec.decode("e", "---\n---\nbody").content).toBe("body");
  });

  test("files without frontmatter use the slug as title", () => {
    expect(frontmatterCodec.decode("adsiz", "sadece dize")).toEqual({
      slug: "adsiz",
      title: "adsiz",
      date: undefined,
      content: "sadece dize",
    });
  });
});
