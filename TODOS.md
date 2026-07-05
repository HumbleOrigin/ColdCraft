# ColdCraft Design TODOs

## From Design Review (2026-07-01)

### ~~P1 — Collapsible 'More options' section~~ ✅ DONE
Referral and Extra context collapsed behind "More options" toggle. Hook angle stays visible.

### ~~P1 — Focus trapping, aria labels, and keyboard navigation~~ ✅ DONE
Focus trap on Settings/History panels. Escape closes panels then sidebar. Aria labels on icon-only elements. Focus-visible rings on all interactive elements.

### P2 — Confirmation before clearing edited variants
When user clicks Back or Regenerate after editing a variant textarea, show 'You have unsaved edits. Copy them first?' before clearing state.
- **Why:** Users can spend minutes polishing a message. Losing it without warning depletes trust instantly.
- **Files:** `contents/sidebar.tsx`
- **Depends on:** Nothing

### P2 — First-time welcome flow with guided API key setup
One-time welcome card for first-time users explaining API keys in plain language: 'Think of it as your password to the AI. Click here to get one — takes 2 minutes, costs fractions of a cent per message.'
- **Why:** ColdCraft's target user is a finance student, not a developer. 'API key' is jargon that causes first-time user bounce.
- **Files:** `contents/sidebar.tsx`
- **Depends on:** Nothing

### P1 — Configurable variant count
Let users choose how many message variants to generate (1–5) instead of hardcoded 2. Add a small number picker or dropdown near the Generate button.
- **Why:** Power users want more options to choose from. Quick outreach users only need one. Hardcoding 2 satisfies neither.
- **Files:** `contents/sidebar.tsx`, `background/messages/generateMessage.ts`
- **Depends on:** Nothing

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

### P3 — User feedback loop for response quality ⚠️ NEEDS EVALUATION
Allow users to flag generated messages as good 👍 or bad 👎. Store feedback locally and use it to improve future generations — potentially by including examples of liked/disliked messages in the prompt context.
- **Why:** Every user has different style preferences. A feedback loop could make the tool get better over time per-user.
- **Challenges:** Where to store preference data (local storage has limits). How much context to include without blowing up token costs. Whether few-shot examples actually steer output meaningfully. Risk of overfitting to early feedback. Needs design discussion before implementation.
- **Files:** `contents/sidebar.tsx`, `background/messages/generateMessage.ts`, possibly new storage module
- **Depends on:** Nothing technically, but needs design decisions first
