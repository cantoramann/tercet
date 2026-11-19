# Minimal tercet site

The smallest complete site: English, poems in a local folder, a custom palette, no S3 and no AWS SDK.

- [`tercet.ts`](tercet.ts): title, language, theme, storage
- [`next.config.ts`](next.config.ts): the content folder, set once
- [`poems/`](poems): one Markdown file per poem
- [`app/`](app): one line per route

```bash
bun run --cwd examples/minimal dev     # http://localhost:3001
bun run --cwd examples/minimal tercet list
```
