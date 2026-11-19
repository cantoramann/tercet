import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    settings: {
      next: { rootDir: ["examples/*/"] },
      // React is a peer of the framework and a dependency of each site, not of the root.
      react: { version: "19.3" },
    },
  },
  {
    // The framework's page factories are App Router layouts, where <head> is correct.
    files: ["packages/tercet/src/pages/**"],
    rules: { "@next/next/no-head-element": "off" },
  },
  { ignores: ["**/.next/**", "**/node_modules/**", "**/next-env.d.ts", "**/dist/**"] },
];

export default config;
