import { createTercet, defineConfig } from "tercet";
import { fs } from "tercet/storage";

export const tercet = createTercet(
  defineConfig({
    title: "Night Notes",
    description: "Small poems, written late.",
    tagline: ["Things written after midnight."],
    locale: "en",
    siteUrl: "https://example.com",
    // Poems come from the folder set in next.config.ts. No S3, no AWS SDK.
    storage: fs(),
    theme: {
      light: { background: "#f7f7f2", text: "#1f2328", muted: "#57606a", highlight: "#fff1a8" },
      dark: { background: "#0d1117", text: "#e6edf3", muted: "#9da7b3", highlight: "#3b3417" },
      font: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
    },
    messages: { back: "home" },
  }),
);
