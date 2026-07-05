# Changelog

All notable changes to ColdCraft will be documented in this file.

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
