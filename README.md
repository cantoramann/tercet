# tercet

[![npm](https://img.shields.io/npm/v/@cantoramann/tercet)](https://www.npmjs.com/package/@cantoramann/tercet)
[![CI](https://github.com/cantoramann/tercet/actions/workflows/ci.yml/badge.svg)](https://github.com/cantoramann/tercet/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@cantoramann/tercet)](LICENSE)

A small, fast, secure Next.js framework for publishing poems.

| | |
| --- | --- |
| [`packages/tercet`](packages/tercet) | The framework, published to npm as [`@cantoramann/tercet`](https://www.npmjs.com/package/@cantoramann/tercet). Docs: [packages/tercet/README.md](packages/tercet/README.md). |
| [`examples/minimal`](examples/minimal) | The smallest complete site: English, disk storage, custom theme, no S3. |

## Development

```bash
bun install
bun dev            # build the package, run the example on http://localhost:3001
bun run build      # package + example
bun run check      # lint + typecheck + tests + audit
```

The example uses the package through the workspace exactly as an npm install would: compiled `dist/`, not source. Rebuild the package (`bun run build:package`) after changing it.

## Releasing

Bump `version` in [`packages/tercet/package.json`](packages/tercet/package.json), commit, then tag and push:

```bash
git tag v0.5.0 && git push origin v0.5.0
```

The [release workflow](.github/workflows/release.yml) runs every check, confirms the tag matches the package version, and publishes to npm with a provenance attestation. It uses npm trusted publishing, so no npm token lives in GitHub. One-time setup on npmjs.com: package settings → Trusted publishing → GitHub Actions, repository `cantoramann/tercet`, workflow `release.yml`.

The very first release has to be published by hand (`cd packages/tercet && npm publish`), since trusted publishing can only be set up for a package that exists.

## License

[MIT](LICENSE)

## Supply chain

Exact versions, a text lockfile, and a 3-day minimum release age for new versions ([`bunfig.toml`](bunfig.toml)). CI runs lint, typecheck, tests, the builds and `bun audit` on every push and weekly. Dependabot proposes updates.
