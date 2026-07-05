# Changelog

All notable changes to ColdCraft will be documented in this file.

## [1.1.0] - 2026-07-05

### Restored
Features originally built July 2 in the deleted `linkedin-cold-message` source folder, reconstructed from session transcripts and merged into the current codebase:
- **Training Data panel** (in the new header dropdown menu): browse rated messages as condensed expandable cards, add/edit notes, flip ratings, remove examples, clear all
- **Style training toggle** ("Learn from my feedback", default off) — rated examples steer generations only while enabled; 10-example library cap with 4 used per generation (2 liked, 2 disliked)
- **Export/Import backup**: training examples + message history as JSON, with replace confirmation (accepts old-format backups)
- **Hamburger dropdown menu** in the header (Message History / Training Data / Settings) with SVG icons, replacing the two icon buttons
- **SVG thumbs-up/down** with active states and toggle-off, replacing emoji buttons
- **Rating context input**: after rating a message, an optional "What did you like? / What would you change?" note feeds into future prompts
- **Confidence checks** per variant: body word count vs 35-55 target, contains a question, has a CTA, avoids generic phrasing

## [1.0.3] - 2026-07-05

### Added
- Conversation-notes field for thank-you, follow-up, and circle-back messages (required for thank-you); the prompt now references only these notes and never invents details of past interactions
- Connection note / Message toggle with a character counter against LinkedIn's 300-char connection-note limit

### Changed
- API key moved from `chrome.storage.sync` to `chrome.storage.local` so it stays on-device (existing keys migrate automatically on first generation)
- README, options page, and privacy policy updated to accurately describe key storage and multi-provider data flow
- Docs (CLAUDE.md, README) aligned with the actual product: IB-student outreach focus, real message types

### Removed
- Groq and Mistral `host_permissions` — custom base URLs now support api.openai.com and openrouter.ai only (OpenRouter proxies most other providers)

## [1.0.2] - 2026-07-05

### Added
- Multi-provider AI support: Anthropic (Claude) and OpenAI-compatible APIs (GPT, Groq, OpenRouter, Mistral)
- Hook extraction: AI identifies 3-5 personal details from recipient profiles as clickable hook angle chips
- Multiple message variants: generate 1-5 variants per request with +/- controls
- Message types: cold outreach, thank-you, follow-up, and circle-back templates
- Style feedback: thumbs up/down on generated messages to train future output preferences
- Message history panel: browse and reuse previously generated messages (stored locally)
- First-time welcome flow with guided API key setup and cost estimates
- Contextual error messages with links to relevant Anthropic console pages
- "Report a problem" link in the sidebar footer
- DESIGN.md, TODOS.md, PRIVACY_POLICY.md documentation
- Options page with provider toggle, model selection, and base URL configuration

### Changed
- AI client refactored into shared `aiClient.ts` with provider routing
- Storage keys migrated from `anthropic_api_key` to `ai_api_key` (multi-provider)
- Sidebar fully rewritten with hook chips, variant display, message type selector, and history
- README updated with pre-built install path and troubleshooting guide
- Removed `scripting` permission (not needed)

## [1.0.1] - 2026-07-01

### Changed
- Design system refinements from design review
- Collapsible "More options" section (referral + extra context)
- Added focus trapping, aria labels, and keyboard navigation to Settings/History panels

## [1.0.0] - 2026-06-27

### Added
- Initial release
- Auto-scrapes LinkedIn profiles (name, title, company, skills, experience, education)
- AI-powered message generation via Anthropic Claude API
- Sender profile setup with LinkedIn import
- Resume paste for richer context matching
- Referral name support for warm intros
- Custom instructions field
- One-click copy to clipboard
- Editable generated messages with word count
- Settings panel with API key management
- Options page for API key configuration
- Extension popup with usage instructions
