import { describe, expect, test } from "bun:test";
import { securityHeaders, withTercet } from "@cantoramann/tercet/next";
import { resolveConfig } from "../src/config.js";
import { format, mergeMessages, plural } from "../src/i18n/index.js";
import { en } from "../src/i18n/locales/en.js";
import { tr } from "../src/i18n/locales/tr.js";

describe("messages", () => {
  test("plural forms follow the language", () => {
    expect(plural(en.search.found, 1, "en")).toBe("1 poem found");
    expect(plural(en.search.found, 3, "en")).toBe("3 poems found");
    expect(plural(tr.search.found, 1, "tr")).toBe("1 şiir bulundu");
  });

  test("format leaves unknown placeholders alone", () => {
    expect(format("{a} {b}", { a: 1 })).toBe("1 {b}");
  });

  test("overrides merge deeply; plural objects are replaced whole", () => {
    const merged = mergeMessages(en, { back: "home", search: { total: "{n} pieces" } });
    expect(merged.back).toBe("home");
    expect(merged.search.total).toBe("{n} pieces");
    expect(merged.search.label).toBe(en.search.label);
    expect(en.back).toBe("back");
  });
});

describe("config", () => {
  test("defaults, locale fallback and trailing slash", () => {
    const site = resolveConfig({ title: "T", locale: "tr-TR", siteUrl: "https://x.test/" });
    expect(site.messages.back).toBe("geri");
    expect(site.siteUrl).toBe("https://x.test");
    expect(site.revalidate).toBe(600);
    expect(resolveConfig({ title: "T", locale: "xx" }).messages.back).toBe("back");
  });
});

describe("withTercet", () => {
  test("keeps site settings, enforces hardening", async () => {
    const config = withTercet({ images: { unoptimized: false }, transpilePackages: ["x"], basePath: "/p" });
    expect(config.transpilePackages).toEqual(["x"]);
    expect(config.basePath).toBe("/p");
    expect(config.images?.unoptimized).toBe(true);
    expect(config.poweredByHeader).toBe(false);
    const [rule] = (await config.headers?.()) ?? [];
    expect(rule?.headers.find((h) => h.key === "X-Frame-Options")?.value).toBe("DENY");
  });

  test("the content folder is set once and reaches the runtime", () => {
    const config = withTercet({}, { contentDir: "poems" });
    expect(config.env?.TERCET_FS_DIR).toBe("poems");
    expect(config.outputFileTracingIncludes?.["/**"]).toEqual(["./poems/**/*"]);
    expect(withTercet({ env: { TERCET_FS_DIR: "mine" } }).env?.TERCET_FS_DIR).toBe("mine");
  });

  test("the AWS SDK is aliased to a stub only when the site lacks it", () => {
    const cwd = process.cwd();
    try {
      process.chdir(new URL("../../../examples/minimal", import.meta.url).pathname);
      const config = withTercet();
      expect(config.turbopack?.resolveAlias?.["@aws-sdk/client-s3"]).toBe("@cantoramann/tercet/missing-s3-sdk");
      // The package itself has the SDK as a dev dependency.
      process.chdir(new URL("..", import.meta.url).pathname);
      expect(withTercet().turbopack).toBeUndefined();
    } finally {
      process.chdir(cwd);
    }
  });

  test("HSTS: host-only by default; subdomains and preload are opt-in", () => {
    const hsts = (options: Parameters<typeof securityHeaders>[0]) =>
      securityHeaders(options).find((h) => h.key === "Strict-Transport-Security")?.value;
    expect(hsts({ dev: false })).toBe("max-age=63072000");
    expect(hsts({ dev: false, hsts: { includeSubDomains: true } })).toBe("max-age=63072000; includeSubDomains");
    expect(hsts({ dev: false, hsts: { preload: true } })).toBe("max-age=63072000; includeSubDomains; preload");
    expect(hsts({ dev: false, hsts: false })).toBeUndefined();
  });

  test("CSP additions merge and replace 'none'", () => {
    const csp = securityHeaders({ dev: false, csp: { "connect-src": ["https://a.test"], "frame-src": ["https://b.test"] } })[0].value;
    expect(csp).toContain("connect-src 'self' https://a.test");
    expect(csp).toContain("frame-src https://b.test");
    expect(csp).not.toContain("unsafe-eval");
  });
});
