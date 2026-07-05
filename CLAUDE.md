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
- **OpenRouter, Groq, Mistral** — also supported via host_permissions

Default model: `claude-sonnet-4-6` (Anthropic) / `gpt-4o` (OpenAI).

### Storage
- `chrome.storage.sync` — API key, sender profile, settings (syncs across devices)
- `chrome.storage.local` — larger data (resume text, LinkedIn profile context)
- No external backend, no analytics, no telemetry

## Key Features
- Auto-scrapes LinkedIn profiles (name, title, company, skills, experience, education)
- 4 message goals: Networking, Job Inquiry, Sales, Partnership
- Tone (Casual/Professional/Friendly) and length (Short/Medium/Long) controls
- Multiple message variants generated per request
- Editable output with one-click copy
- Sender profile + optional resume for personalization
- Hook extraction: AI finds 3-5 personal details to reference

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
1.0.1

## Active TODOs
See TODOS.md for the prioritized backlog. Key open items:
- P1: Configurable variant count (1-5)
- P2: Confirmation before clearing edited variants
- P2: First-time welcome flow with guided API key setup
- P2: Model dropdown and token usage display

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
