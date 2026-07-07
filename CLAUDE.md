# CLAUDE.md

General project guide and technology stack reference for this repository.

## Project Overview

This repository is a browser extension built with WXT (React) and Bun that acts as an AI Client for any OpenAI-API-compatible endpoint. The UI is rendered inside a browser side panel. Users configure a base URL, an API key, and pick a model; the extension then exposes a chat interface with streaming responses, thinking/reasoning display, and file upload.

This file describes the technical foundation, conventions, and hard rules for any agent working in this codebase.

## Technology Stack

| Concern              | Choice                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Runtime / PM         | Bun                                                                    |
| Extension framework  | WXT (Manifest V3, file-based entrypoints, auto-imports)               |
| UI framework         | React 19                                                               |
| Styling              | Tailwind CSS v4 via `@tailwindcss/vite`                                |
| Component system     | shadcn/ui (style `radix-maia`, baseColor `neutral`, cssVariables on)   |
| Icons                | hugeicons (`@hugeicons/react`, `@hugeicons/core-free-icons`)           |
| Animation            | `tw-animate-css`                                                       |
| Font                 | `@fontsource-variable/figtree`                                         |
| State / persistence  | React hooks + `wxt/storage` (`storage.local` area)                     |
| Language             | TypeScript (strict, extends `.wxt/tsconfig.json`), path alias `@/*`    |

Key config sources of truth:
- `wxt.config.ts` — WXT manifest, modules, Vite plugins, alias.
- `components.json` — shadcn configuration (style, aliases, icon library).
- `tsconfig.json` — TS options and `@/*` path mapping.
- `assets/tailwind.css` — Tailwind theme tokens, light/dark variables.

## Project Layout

```
.
├── assets/                 # tailwind.css, fonts, static assets
├── components/
│   ├── chat/               # chat feature components (MessageBubble, ThinkingPanel, MermaidDiagram, markdown-components, ...)
│   ├── settings/           # settings feature components (McpServersSection, McpToolsSection, ...)
│   └── ui/                 # shadcn components (added via CLI, never hand-written)
├── entrypoints/
│   ├── background.ts       # MV3 service worker
│   ├── content.ts          # content script (unused for v1)
│   ├── popup/              # popup entrypoint
│   └── sidepanel/          # PRIMARY UI entrypoint (App.tsx, main.tsx, index.html)
├── lib/
│   ├── api/                # OpenAI-compatible client + SSE parser + MCP client
│   ├── storage/            # typed storage.defineItem declarations
│   ├── types/              # shared TS types
│   └── utils.ts            # shadcn cn() helper
├── public/                 # static assets served at /
├── components.json         # shadcn config
├── package.json
├── tsconfig.json
├── vite.config.ts
└── wxt.config.ts
```

All user-facing UI lives in `entrypoints/sidepanel/`. Do not split UI into the popup unless explicitly asked.

## Agent Instructions (Hard Rules)

These rules are mandatory for any agent editing this codebase.

1. **Package manager**: Always use `bun`. Never run `npm`, `yarn`, or `pnpm`.
2. **shadcn components**: To add ANY shadcn/ui component, run:
   ```
   bunx --bun shadcn@latest add <component>
   ```
   Never hand-write component implementations under `components/ui/`. The CLI is the only supported way to create or update them.
3. **WXT auto-imports**: `defineBackground`, `defineContentScript`, `defineConfig`, `browser`, and `storage` are auto-imported by WXT. Do not add explicit imports for these.
4. **Storage**: All persisted data MUST use `wxt/storage` with the `local:` prefix and be declared via `storage.defineItem<T>()` with an explicit type. Do not read/write raw `chrome.storage`. The `local:settings` item stores both user config (`mcpServers`) and the discovered-tool cache (`discoveredTools: McpToolsByServer`), keyed by server id.
5. **UI location**: Keep all UI inside the `sidepanel` entrypoint and `components/`. Do not create new entrypoints unless asked.
6. **Icons**: Use hugeicons only (already configured in `components.json`). Do not add lucide-react or other icon libraries.
7. **No comments**: Do not add comments to code unless the user explicitly requests them.
8. **Verification**: After any change, run `bun run compile` (tsc) and `bun run build`. Fix all errors before considering the task done.
9. **Commits**: Never commit changes unless the user explicitly asks. When asked, stage only intended files and write a concise message matching repo style.
10. **Never commit secrets**: No API keys, tokens, or credentials in code or commits.

## Conventions

- **Indentation**: 2 spaces.
- **Quotes**: Single quotes for TS/TSX strings.
- **Semicolons**: Keep semicolons (matches existing files).
- **Path alias**: Use `@/` for all intra-project imports (maps to repo root per `tsconfig.json` and `wxt.config.ts`).
- **shadcn components** land in `@/components/ui` (managed by the CLI).
- **Feature components** land in `@/components/<feature>` (e.g. `@/components/chat`).
- **Logic / API / types** live under `@/lib` (e.g. `@/lib/api`, `@/lib/storage`, `@/lib/types`).
- **File naming**: kebab-case for non-component files, PascalCase for component files.
- **Auto-imports**: prefer WXT auto-imports over manual imports where available.

## Development Commands

| Command                                   | Purpose                                  |
| ----------------------------------------- | ---------------------------------------- |
| `bun install`                             | Install dependencies                      |
| `bun run dev`                             | Start WXT dev server (Chrome, with HMR)   |
| `bun run dev:firefox`                     | Dev for Firefox                           |
| `bun run build`                            | Production build                          |
| `bun run build:firefox`                   | Production build for Firefox              |
| `bun run compile`                         | Type-check via `tsc --noEmit`             |
| `bun run zip` / `bun run zip:firefox`     | Package extension for store upload        |
| `bunx --bun shadcn@latest add <component>` | Add a shadcn/ui component (REQUIRED way) |

## Reference

- WXT docs: https://wxt.dev
- shadcn/ui docs: https://ui.shadcn.com
- OpenAI API reference (compatibility target): https://platform.openai.com/docs/api-reference/chat
