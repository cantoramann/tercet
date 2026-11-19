// Plain JavaScript on purpose: next.config files import this before any
// TypeScript compilation is set up.
import { createRequire } from "node:module";
import path from "node:path";

/**
 * Content-Security-Policy, as directive → sources.
 *
 * About script-src 'unsafe-inline': pages are prerendered and served from
 * cache, and Next.js inlines its hydration data as <script> tags. A nonce
 * would force every request to render on the server. A hash cannot be used
 * either, because listing one makes browsers ignore 'unsafe-inline'. The
 * remaining risk is small: poem text is always rendered through React's
 * escaping (no dangerouslySetInnerHTML, no MDX evaluation), so no untrusted
 * markup reaches the page, and every other directive is locked down.
 */
function baseCsp(dev) {
  return {
    "default-src": ["'self'"],
    // Dev mode needs eval for React Refresh.
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...(dev ? ["ws:", "wss:"] : [])],
    "media-src": ["'none'"],
    "object-src": ["'none'"],
    "frame-src": ["'none'"],
    "worker-src": ["'none'"],
    "manifest-src": ["'self'"],
    "base-uri": ["'none'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
}

/**
 * HSTS. `preload` and `includeSubDomains` affect the whole domain and are hard
 * to undo (browsers ship the preload list), so they are opt-in.
 * @param {{ includeSubDomains?: boolean, preload?: boolean } | false | undefined} hsts
 */
function hstsValue(hsts) {
  const parts = ["max-age=63072000"];
  if (hsts?.includeSubDomains || hsts?.preload) parts.push("includeSubDomains");
  if (hsts?.preload) parts.push("preload");
  return parts.join("; ");
}

/** @param {{ dev: boolean, csp?: Record<string, string[]>, hsts?: { includeSubDomains?: boolean, preload?: boolean } | false }} options */
export function securityHeaders({ dev, csp = {}, hsts }) {
  const directives = baseCsp(dev);
  for (const [name, sources] of Object.entries(csp)) {
    const current = (directives[name] ?? []).filter((source) => source !== "'none'");
    directives[name] = [...new Set([...current, ...sources])];
  }
  const policy = Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(" ")}`)
    .join("; ");

  return [
    { key: "Content-Security-Policy", value: policy },
    ...(hsts === false ? [] : [{ key: "Strict-Transport-Security", value: hstsValue(hsts) }]),
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    { key: "Origin-Agent-Cluster", value: "?1" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
    {
      key: "Permissions-Policy",
      value: [
        "accelerometer=()", "autoplay=()", "camera=()", "display-capture=()", "geolocation=()",
        "gyroscope=()", "magnetometer=()", "microphone=()", "midi=()", "payment=()",
        "publickey-credentials-get=()", "screen-wake-lock=()", "serial=()", "usb=()",
        "xr-spatial-tracking=()", "browsing-topics=()", "interest-cohort=()",
      ].join(", "),
    },
  ];
}

/**
 * Wrap a site's Next.js config with the framework's requirements and
 * hardening. Site settings win, except where noted.
 *
 * @param {import("next").NextConfig} [nextConfig]
 * @param {import("./index").TercetNextOptions} [options]
 * @returns {import("next").NextConfig}
 */
export function withTercet(nextConfig = {}, options = {}) {
  const dev = process.env.NODE_ENV === "development";

  // The one place the content folder is set. It is passed to the runtime
  // through `env` (inlined at build) and read by `fs()` and the CLI.
  const contentDir = options.contentDir ?? process.env.TERCET_FS_DIR ?? "content/poems";
  // Ship that folder with the server output (standalone builds, Vercel) when it lives inside the app.
  const relative = path.relative(process.cwd(), path.resolve(contentDir));
  const traced = relative && !relative.startsWith("..") && !path.isAbsolute(relative) ? [`./${relative}/**/*`] : [];
  const userTracing = nextConfig.outputFileTracingIncludes ?? {};

  return {
    poweredByHeader: false,
    reactStrictMode: true,
    ...nextConfig,
    // Always on: the site serves no raster images, and disabling the optimizer
    // makes /_next/image a 404, removing the image-decoding attack surface.
    images: { ...nextConfig.images, unoptimized: true },
    outputFileTracingIncludes: {
      ...userTracing,
      "/**": [...(userTracing["/**"] ?? []), ...traced],
    },
    env: { TERCET_FS_DIR: contentDir, ...nextConfig.env },
    ...optionalS3Sdk(nextConfig),
    async headers() {
      const own = (await nextConfig.headers?.()) ?? [];
      // The site's own rules come last, so a header it sets overrides the default with the same name.
      return [{ source: "/:path*", headers: securityHeaders({ dev, csp: options.csp, hsts: options.hsts }) }, ...own];
    },
  };
}

const SDK = "@aws-sdk/client-s3";
const MISSING_SDK = "tercet/missing-s3-sdk";

/**
 * The AWS SDK is an optional peer dependency. When the site has not installed
 * it, alias it to a stub so the build succeeds without bundling any of it; the
 * s3 driver then reports how to install it if someone selects it.
 */
function optionalS3Sdk(nextConfig) {
  const require = createRequire(path.join(process.cwd(), "package.json"));
  try {
    require.resolve(SDK);
    return {};
  } catch {
    const turbopack = nextConfig.turbopack ?? {};
    const userWebpack = nextConfig.webpack;
    return {
      turbopack: { ...turbopack, resolveAlias: { ...turbopack.resolveAlias, [SDK]: MISSING_SDK } },
      webpack(config, context) {
        config.resolve ??= {};
        config.resolve.alias = { ...config.resolve.alias, [SDK]: require.resolve(MISSING_SDK) };
        return userWebpack ? userWebpack(config, context) : config;
      },
    };
  }
}
