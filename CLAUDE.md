# ColdCraft - LinkedIn Cold Messaging Extension

## Overview

Chrome extension (MV3) that injects a sidebar on LinkedIn profile pages and generates personalized cold outreach messages using AI. Built with **Plasmo** framework, **React** (hooks-based), and **TypeScript**.

**This directory is a production build output** (`build/chrome-mv3-prod/` or equivalent). The source project lives in a separate directory with `contents/`, `background/`, `options.tsx`, `popup.tsx`, `package.json`, and `tsconfig.json`. See README.md for the full source tree layout.

## Tech Stack

- **Framework:** Plasmo (Chrome extension framework)
- **UI:** React with hooks (useState, useEffect, useRef, useCallback)
- **Language:** TypeScript
- **Package manager:** pnpm
- **Build output:** Manifest V3 Chrome extension
- **Styling:** Inline styles, dark theme (#0A0F1E background), Inter font. See DESIGN.md for the full design system.

## Architecture

### Source Structure (when working from source)
```
contents/sidebar.tsx        — Content script: injected sidebar UI on LinkedIn profiles
background/messages/
  generateMessage.ts        — Service worker: handles AI message generation
  extractRecipientHooks.ts  — Extracts hook-worthy details from LinkedIn profiles
  extractSenderProfile.ts   — Extracts sender info from user's own LinkedIn page
background/aiClient.ts      — Multi-provider AI client (provider routing, API calls)
options.tsx                 — Settings page (API key, sender profile, resume, model config)
popup.tsx                   — Extension popup (usage instructions)
```

### Message Passing
Chrome runtime messaging between content script and background service worker:
- `extractRecipientHooks` — scrapes recipient profile, sends to AI for hook extraction
- `extractSenderProfile` — scrapes sender's own LinkedIn profile
- `generateMessage` — sends profile data + settings to AI, returns message variants

### AI Providers
Multi-provider support via `aiClient.ts`:
- **Anthropic** (default) — Claude Sonnet 4.6, Opus 4.6, Haiku 4.5
- **OpenAI** — GPT-4o, GPT-4o-mini, GPT-4.1, GPT-4.1-mini
- **OpenRouter** — supported via the OpenAI-compatible base URL (has its own host_permissions entry)

Default model: `claude-sonnet-4-6` (Anthropic) / `gpt-4o` (OpenAI).

### Storage
- `chrome.storage.local` — API key (device-only, never synced), resume text, LinkedIn profile context, message history, style examples
- `chrome.storage.sync` — sender profile and non-secret settings (provider, model, base URL; syncs across devices)
- No external backend, no analytics, no telemetry

## Product Focus
ColdCraft is built for **students and early-career professionals cold-messaging investment bankers**. The generation prompt encodes IB networking norms (seniority-based greetings, humble intros, banned clichés, casual questions). Keep this niche in mind — the sender profile is school/year/status/target-area, not a generic persona.

## Key Features
- Auto-scrapes LinkedIn profiles (raw page text + hook extraction)
- 4 message types: Cold outreach, Thank-you, Follow-up, Circle back
- Conversation-notes field for thank-you/follow-up/circle-back (required for thank-you) so messages never invent details of past interactions
- Multiple message variants (1-5) per request
- Editable output with one-click copy, word count, and connection-note (300 char) counter
- Sender profile + optional resume for personalization
- Hook extraction: AI finds 3-5 personal details to reference
- Style learning: thumbs up/down (SVG) with optional context notes, fed back into prompts; gated by a "Learn from my feedback" toggle (default off)
- Training Data panel (via header dropdown menu): manage rated examples (10 max, 4 used per generation), export/import JSON backups
- Confidence checks per variant (word count, question, CTA, generic-phrase detection)
- Message history panel (last 50, stored locally)

## Build & Dev Commands
```bash
pnpm install          # install dependencies
pnpm dev              # dev build with hot reload → build/chrome-mv3-dev/
pnpm build            # production build → build/chrome-mv3-prod/
```

Load in Chrome: `chrome://extensions/` → Developer mode → Load unpacked → select build folder.

## Content Script Activation
Only injects on `https://www.linkedin.com/in/*` profile pages (configured in manifest `content_scripts.matches`).

## Current Version
1.2.0

## Active TODOs
See TODOS.md for the backlog. All items from the 2026-07-01 design review and 2026-07-05 audit are done. Candidate next items: reply tracking on history entries, one-click insert into LinkedIn's message box.

## Conventions

### Coding Style
- React functional components with hooks (no class components)
- Inline styles (no CSS modules or styled-components) — all styles follow DESIGN.md tokens
- TypeScript strict mode
- All AI calls go through the background service worker, never from content scripts directly
- API keys never touch page context — only read from background service worker via chrome.storage

### Naming
- Message handler files: `background/messages/<handlerName>.ts`
- Content scripts: `contents/<name>.tsx`
- camelCase for variables/functions, PascalCase for components

### Design System
All UI must follow DESIGN.md. Key rules:
- Dark theme only (#0A0F1E background)
- Inter font family
- Blue accent (#2563EB) for primary actions
- White text with opacity scale for hierarchy (see DESIGN.md for exact values)
- 10-12px border radius on cards, 7-8px on buttons/inputs, 20px pill on chips

## gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__Claude_in_Chrome__*` tools.

### Available skills

/office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review, /design-consultation, /design-shotgun, /design-html, /review, /ship, /land-and-deploy, /canary, /benchmark, /browse, /connect-chrome, /qa, /qa-only, /design-review, /setup-browser-cookies, /setup-deploy, /setup-gbrain, /retro, /investigate, /document-release, /document-generate, /codex, /cso, /autoplan, /plan-devex-review, /devex-review, /careful, /freeze, /guard, /unfreeze, /gstack-upgrade, /learn

## Self-Maintenance Rules

- **Structural changes:** When making significant architectural changes (new modules, changed message flow, new providers, storage schema changes, new content scripts, manifest permission changes), ask the user: "This is a significant structural change. Want me to update CLAUDE.md to reflect it?"
- **Convention updates:** Automatically update the Conventions section when establishing new patterns that future sessions need to know (e.g., adopting a new state management approach, changing the styling strategy, adding a test framework).
