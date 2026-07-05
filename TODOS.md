# ColdCraft Design TODOs

## From Design Review (2026-07-01)

### ~~P1 — Collapsible 'More options' section~~ ✅ DONE
Referral and Extra context collapsed behind "More options" toggle. Hook angle stays visible.

### ~~P1 — Focus trapping, aria labels, and keyboard navigation~~ ✅ DONE
Focus trap on Settings/History panels. Escape closes panels then sidebar. Aria labels on icon-only elements. Focus-visible rings on all interactive elements.

### ~~P1 — Configurable variant count~~ ✅ DONE
Users can choose 1-5 message variants with +/- buttons near the Generate button.

### P2 — Confirmation before clearing edited variants
When user clicks Back or Regenerate after editing a variant textarea, show 'You have unsaved edits. Copy them first?' before clearing state.
- **Why:** Users can spend minutes polishing a message. Losing it without warning depletes trust instantly.
- **Files:** `contents/sidebar.tsx`
- **Depends on:** Nothing

### ~~P2 — First-time welcome flow with guided API key setup~~ ✅ DONE
One-time welcome card for first-time users explaining API keys in plain language.

### P2 — Model dropdown and token usage display
Replace the free-text model input with a dropdown of known models per provider (Claude: Opus, Sonnet, Haiku; OpenAI: GPT-4o, GPT-4o-mini, etc.). Show a token usage indicator after generation — input tokens, output tokens, and estimated cost — similar to what Claude and OpenAI show in their UIs.
- **Why:** Users shouldn't need to know model IDs. Token usage gives cost transparency, which matters for students on tight budgets.
- **Files:** `contents/sidebar.tsx`, `options.tsx`, `background/aiClient.ts`, `background/messages/generateMessage.ts`
- **Depends on:** AI providers returning usage data in responses (Anthropic and OpenAI both do)

### P3 — Generation progress text in loading skeleton
Replace plain shimmer with progress text: 'Analyzing profile...' → 'Generating variant 1 of 2...' → 'Polishing...'
- **Why:** 5-15 seconds of identical shimmer looks like a frozen UI. Progress text builds trust during the longest wait.
- **Files:** `contents/sidebar.tsx`
- **Depends on:** Nothing

### ~~P3 — User feedback loop for response quality~~ ✅ DONE
Thumbs up/down rating on generated messages, stored locally, fed back into prompts as style examples.

## From Audit (2026-07-05)

### P2 — Decompose sidebar into sub-components
Break the 900+ line sidebar.tsx into smaller components (ProfileSection, SettingsPanel, HistoryPanel, MessageOutput, HookBadges, etc.). Improves maintainability and testability.
- **Files:** `contents/sidebar.tsx` → multiple files
- **Depends on:** Nothing

### P2 — Add test framework and basic tests
Set up Vitest with tests for aiClient, sanitize, and message handlers. Priority: test the AI client error handling, prompt injection sanitization, and variant splitting logic.
- **Files:** New test files, `package.json`
- **Depends on:** Nothing

### P2 — Bundle Inter font locally
Load Inter from extension assets instead of Google Fonts CDN to eliminate the network request and FOUT on every LinkedIn page.
- **Files:** `contents/sidebar.tsx`, extension assets
- **Depends on:** Nothing

### P3 — Replace URL polling with browser navigation API
Replace the 500ms setInterval for detecting LinkedIn navigation with chrome.tabs.onUpdated or popstate events.
- **Files:** `contents/sidebar.tsx`
- **Depends on:** Nothing

### P3 — Consider chrome.storage.session for API keys
Move API key storage from chrome.storage.sync (accessible to all extension contexts) to chrome.storage.session (scoped to service worker lifetime) for tighter security. Trade-off: key won't persist across browser restarts.
- **Files:** `background/aiClient.ts`, `options.tsx`, `contents/sidebar.tsx`
- **Depends on:** User feedback on persistence trade-off
