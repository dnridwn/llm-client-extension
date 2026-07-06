# LLM Client

A browser extension that turns any OpenAI-API-compatible endpoint into a chat interface, rendered inside the browser side panel. Built with WXT, React 19, and Bun. Supports streaming responses, reasoning/thinking display, file uploads (images, PDFs, text), and Model Context Protocol (MCP) tool calling.

## Overview

LLM Client is a Manifest V3 extension whose entire UI lives in the browser side panel. You configure a base URL, an API key (optional for local endpoints), and pick a model; the extension then exposes a chat experience with streaming responses, collapsible reasoning display, markdown rendering with syntax highlighting, file uploads (including PDF text extraction and vision-capable images), and remote MCP tool servers exposed to the model as OpenAI function tools. Settings and chat history persist locally and sync live across the panel.

## Features

**Chat & streaming**
- Streaming responses via Server-Sent Events, with Stop, Regenerate, and Clear
- `requestAnimationFrame`-batched delta rendering for smooth output
- Auto-scroll only when the user is near the bottom
- Copy-to-clipboard on assistant messages

**Reasoning / thinking**
- Parses `reasoning_content` / `reasoning` from the stream
- Collapsible "Thinking" panel, shown while streaming and after the answer
- Configurable reasoning effort: `minimal` / `low` / `medium` / `high`

**Endpoints & models**
- Any OpenAI-compatible `/v1/chat/completions` + `/v1/models` endpoint
- Model discovery with a searchable combobox, plus manual entry mode
- "Test Connection" with result toast and auto-select first model
- API key show/hide toggle; optional for local providers

**Files & attachments**
- Images (png/jpeg/gif/webp) sent as `image_url` content parts for vision models
- PDF text extraction via `pdfjs-dist`, inlined into the message text
- Text files: txt, md, csv, json, xml, html
- Drag-and-drop one or more files anywhere onto the side panel to attach them
- Paste a copied image (`Cmd/Ctrl+V`) into the composer textarea to attach it; plain-text paste still inserts text normally
- 20 MB payload guard with `PayloadTooLargeError`
- Attachment chips with thumbnails and sizes

**MCP tool calling**
- Multi-server MCP via `@modelcontextprotocol/client` (`streamable-http` and `sse` transports)
- Tools are name-prefixed (`serverName__toolName`) to avoid collisions across servers
- Custom per-server headers with a secret toggle for auth
- Test / enable / disable / edit / delete per server
- Agentic tool loop: parse tool calls, invoke tools, append `tool` messages, continue streaming — up to 10 tool turns
- Graceful fallback: endpoints that reject tools are retried once without tools and surfaced with a warning

**UI / UX**
- Side-panel interface opened on action click
- System-driven light/dark theme via `prefers-color-scheme`
- GitHub-Flavored Markdown rendering with `rehype-highlight` and a custom OKLCH highlight theme
- Toast notifications via `sonner`
- First-run onboarding straight into Settings

**Persistence**
- `wxt/storage` (`local:` area): `settings` and `chat-history`
- Live-syncing React hooks (`useSettings`, `useChatHistory`) via `.watch()`

## Tech Stack

| Concern             | Choice                                                              |
| ------------------- | ------------------------------------------------------------------- |
| Runtime / PM        | Bun                                                                 |
| Extension framework | WXT (Manifest V3, file-based entrypoints, auto-imports)             |
| UI framework        | React 19                                                            |
| Styling             | Tailwind CSS v4 via `@tailwindcss/vite` / `@tailwindcss/postcss`    |
| Component system     | shadcn/ui (style `radix-maia`, baseColor `neutral`, cssVariables)   |
| Icons               | hugeicons (`@hugeicons/react`, `@hugeicons/core-free-icons`)        |
| Animation           | `tw-animate-css`                                                    |
| Font                | `@fontsource-variable/figtree`                                      |
| Markdown            | `react-markdown` + `remark-gfm` + `rehype-highlight` + `highlight.js` |
| PDF parsing          | `pdfjs-dist`                                                        |
| MCP client          | `@modelcontextprotocol/client` (2.0.0-beta.2)                     |
| State / persistence | React hooks + `wxt/storage` (`storage.local` area)                  |
| Language            | TypeScript (strict), path alias `@/*`                              |

## Project Structure

```
.
├── assets/                 # tailwind.css, highlight-theme.css, fonts, static assets
├── components/
│   ├── chat/               # chat feature components
│   ├── settings/           # settings feature components
│   └── ui/                 # shadcn components (CLI-managed, never hand-written)
├── entrypoints/
│   ├── background.ts       # MV3 service worker (opens side panel on action click)
│   ├── content.ts           # starter content script (unused in v1)
│   ├── popup/               # starter popup (unused in v1)
│   └── sidepanel/          # PRIMARY UI entrypoint (App.tsx, main.tsx, index.html)
├── lib/
│   ├── api/                # OpenAI-compatible client, SSE parser, MCP client
│   ├── files/              # file ingestion (images, PDFs, text) + content-part builder
│   ├── storage/            # typed storage.defineItem declarations + hooks
│   ├── types/              # shared TS types
│   └── utils.ts            # shadcn cn() helper
├── public/                 # extension icons + static assets served at /
├── components.json          # shadcn config
├── package.json
├── tsconfig.json
├── vite.config.ts
└── wxt.config.ts
```

## Architecture

- **Background service worker** (`entrypoints/background.ts`) is minimal — it sets `openPanelOnActionClick: true` so clicking the extension icon opens the side panel. All logic runs in the side panel; there is no messaging bridge.
- **Side panel UI** (`entrypoints/sidepanel/`) is the whole application. `App.tsx` toggles between `SettingsScreen` and `ChatScreen` based on local view state and whether a base URL is configured.
- **Storage** (`lib/storage/`) declares `local:settings` and `local:chat-history` via `storage.defineItem<T>()` and exposes `useSettings` / `useChatHistory` hooks that lazy-load, subscribe via `.watch()`, and write via `.setValue()`.
- **API client** (`lib/api/`) is a thin OpenAI-compatible client: `client.ts` for `/v1/models` and `/v1/chat/completions` (streaming + non-streaming), `sse.ts` for SSE parsing, and `mcp.ts` for MCP tool discovery/invocation.
- **File handling** (`lib/files/`) converts uploads to `Attachment` objects — images to data URLs, PDFs to extracted text, text files to plain text — and assembles OpenAI multipart `content` for vision-capable models.
- **Chat orchestration** (`components/chat/ChatScreen.tsx`) wires storage -> message building -> streaming -> tool execution -> history mutation, with a multi-turn tool-calling loop (max 10 turns) and graceful degradation when an endpoint rejects tools.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (used as the package manager and script runner)
- A Chromium or Firefox browser for loading the unpacked extension

### Install

```bash
bun install
```

### Commands

| Command                                   | Purpose                                  |
| ----------------------------------------- | ---------------------------------------- |
| `bun run dev`                             | Start WXT dev server (Chrome, with HMR)  |
| `bun run dev:firefox`                     | Dev for Firefox                          |
| `bun run build`                           | Production build                         |
| `bun run build:firefox`                    | Production build for Firefox             |
| `bun run compile`                         | Type-check via `tsc --noEmit`            |
| `bun run zip` / `bun run zip:firefox`      | Package extension for store upload       |
| `bunx --bun shadcn@latest add <component>` | Add a shadcn/ui component (required way) |

### Load the extension

After `bun run build`, load the unpacked extension from `.output/chrome-mv3` (or `.output/firefox-mv2` for Firefox) via your browser's extension developer tools. In dev, `bun run dev` opens a dedicated browser with the extension preloaded and HMR enabled.

## Configuration & Usage

1. Open the side panel (click the extension icon). On first run you land in **Settings**.
2. Set a **Base URL** (e.g. `https://api.openai.com/v1` or a local server). Provide an **API Key** (optional for local endpoints).
3. Click **Test Connection** to fetch available models, or pick **Manual entry** to type a model id.
4. Choose reasoning display (Thinking toggle + effort), temperature, and an optional system instruction.
5. Optionally configure **MCP servers** (name, URL, transport, custom headers) and enable them to expose tools to the model.
6. Save. The chat composer accepts text and attachments (images, PDFs, text files). Press Enter to send, Shift+Enter for a newline.

## Development Notes

- **Package manager**: always use `bun`.
- **shadcn components**: add via `bunx --bun shadcn@latest add <component>`; never hand-write files under `components/ui/`.
- **WXT auto-imports**: `defineBackground`, `defineContentScript`, `defineConfig`, `browser`, and `storage` are auto-imported by WXT — do not add explicit imports for these.
- **Storage**: all persisted data uses `wxt/storage` with the `local:` prefix and `storage.defineItem<T>()`; do not read/write raw `chrome.storage`.
- **Icons**: hugeicons only; do not add other icon libraries.
- **Verification**: run `bun run compile` and `bun run build` after changes; fix all errors before considering a task done.
- **Indentation**: 2 spaces, single quotes, semicolons retained. Use the `@/*` path alias for intra-project imports.

## Known Limitations

- MCP tool loop is capped at 10 turns per user message.
- File payload is capped at 20 MB total per message; the same limit applies to dragged-and-dropped and pasted files, which are persisted as base64 in `chrome.storage.local`.
- Endpoints that do not support tool calling are retried once without tools (with a warning toast).
- Theme follows the OS (`prefers-color-scheme`); there is no manual theme toggle in the UI.
- The `popup/` and `content.ts` entrypoints are unused starter leftovers and do not affect the side-panel experience.