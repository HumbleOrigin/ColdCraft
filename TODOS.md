# ColdCraft Design TODOs

## From Design Review (2026-07-01)

### ~~P1 — Collapsible 'More options' section~~ ✅ DONE
Referral and Extra context collapsed behind "More options" toggle. Hook angle stays visible.

### ~~P1 — Focus trapping, aria labels, and keyboard navigation~~ ✅ DONE
Focus trap on Settings/History panels. Escape closes panels then sidebar. Aria labels on icon-only elements. Focus-visible rings on all interactive elements.

### ~~P1 — Configurable variant count~~ ✅ DONE
Users can choose 1-5 message variants with +/- buttons near the Generate button.

### ~~P2 — Confirmation before clearing edited variants~~ ✅ DONE
When user clicks Regenerate after editing a variant textarea, shows 'You have unsaved edits. Copy them first?' before clearing state. Edit tracking via `variantsEdited` ref, reset on navigation and after confirmed regeneration.

### ~~P2 — First-time welcome flow with guided API key setup~~ ✅ DONE
One-time welcome card for first-time users explaining API keys in plain language.

### ~~P2 — Model dropdown and token usage display~~ ✅ DONE
Model dropdown in options.tsx with per-provider model lists (ANTHROPIC_MODELS, OPENAI_MODELS) defined in aiClient.ts. Token usage indicator (input/output tokens + estimated cost) shown after generation in the sidebar.

### ~~P3 — Generation progress text in loading skeleton~~ ✅ DONE
Progressive status text during generation: 'Analyzing profile...' → 'Generating variant 1 of N...' → 'Polishing...' with 3-second intervals.

### ~~P3 — User feedback loop for response quality~~ ✅ DONE
Thumbs up/down rating on generated messages, stored locally, fed back into prompts as style examples.

## From Audit (2026-07-05)

### ~~P2 — Decompose sidebar into sub-components~~ ✅ DONE
Extracted SettingsPanel, HistoryPanel, MessageOutput, and ProfileSection into `contents/components/`. Sidebar.tsx now orchestrates state and delegates rendering to sub-components.

### ~~P2 — Add test framework and basic tests~~ ✅ DONE
Vitest configured with tests for sanitize (prompt injection), aiClient (model definitions), and variant splitting logic. 15 tests across 3 files. Run with `pnpm test`.

### ~~P2 — Bundle Inter font locally~~ ✅ DONE
Inter woff2 loaded from `assets/fonts/inter-latin.woff2` via `chrome.runtime.getURL`. No Google Fonts CDN dependency. Added to `web_accessible_resources` in manifest.

### ~~P3 — Replace URL polling with browser navigation API~~ ✅ DONE
Replaced 500ms setInterval with popstate + visibilitychange event listeners and a MutationObserver on the document title element.

### P3 — Consider chrome.storage.session for API keys
Evaluated and deferred. Trade-off: tighter security (key scoped to service worker lifetime) but key won't persist across browser restarts, which is a bad UX for the target user (students who don't want to re-enter keys). Current approach (chrome.storage.sync) is acceptable since keys never touch page context.
