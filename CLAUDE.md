# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
npm run build          # esbuild bundle → dist/cli.js
npm run dev            # watch mode (nodemon + rebuild)
npm start              # node dist/cli.js
npm test               # jest
npm test -- --testPathPattern=<pattern>  # run a single test file
npm run test:coverage  # jest with coverage
ts-node release.ts [major|minor|patch]  # bump version, build, tag
```

No linter is configured. No tsconfig.json — esbuild handles TypeScript directly.

## Architecture

**Layered design**: CLI (Commander.js) → Tools (handlers) → TwitterClient (API wrapper) → Cache + Config

### Entry point

`cli.ts` — defines all Commander commands, lazy-imports tool handlers from `src/tools/*` on execution. Global `--profile <name>` option switches accounts.

### Source layout

- **`src/twitter/client.ts`** — `TwitterClient` class wrapping `twitter-api-v2`. Implements cost-minimization: 24h UTC dedup cache, user harvesting from API responses, batch fetching (up to 100 tweets/users per call), getMe() caching. All API error handling lives here (`handleApiError()`).
- **`src/twitter/index.ts`** — Singleton client initialization, `getTwitterClient()` factory.
- **`src/tools/`** — One module per domain: `tweets.ts`, `users.ts`, `search.ts`, `posting.ts`, `follows.ts`. Each exports `ToolDefinition[]` with `{ name, description, inputSchema, handler }`. Tool names follow `twitter_<action>_<noun>` pattern.
- **`src/config/credentials.ts`** — Multi-profile credential manager. Stores in `~/.twitter-cli/config.json` (mode 0o600). Handles legacy flat-config migration.
- **`src/config/constants.ts`** — App constants.
- **`src/utils/cache.ts`** — File-backed 24h UTC dedup cache at `~/.twitter-cli/cache.json`. Dual-keys users by ID and lowercase username. Sentinel keys `__me__` / `__me__:userId` for authenticated user.
- **`src/utils/result-formatter.ts`** — `formatTextResult()` / `formatErrorResult()` returning `ToolResult`.
- **`src/types/index.ts`** — Shared TypeScript interfaces (`ToolDefinition`, `ToolResult`, etc.).

### Credential resolution order

1. Shell environment variables (`TWITTER_API_KEY`, etc.)
2. `~/.twitter-cli/config.json` (persistent profiles)
3. `.env` file in CWD

Read ops need bearer token OR API key+secret. Write ops need all four OAuth 1.0a credentials.

### Build

`build.js` uses esbuild to produce a single minified bundle with shebang. Version injected via `__PACKAGE_VERSION__` define. All dependencies bundled — no external node_modules needed at runtime.

## Key Patterns

- **Cost minimization is a core design goal** — caching, batching, and response harvesting are not incidental; they're central to the architecture. Preserve these patterns when adding new API operations.
- **Tool handlers return `ToolResult`** — `{ content: [{ type: "text", text }], isError?: true }`. Always use `formatTextResult`/`formatErrorResult`.
- **User output goes to stderr** (with emoji prefixes like 🔍 ✅ ❌), **JSON data goes to stdout**. This separation is intentional for piping.
- **Profile-aware init**: `getProfileFromArgv()` extracts `--profile` early, `injectStoredCredentials(profile)` overlays into `process.env` before client creation.
