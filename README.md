# ColdCraft — LinkedIn Cold Message Generator

An AI-powered Chrome extension that injects a polished sidebar into LinkedIn profile pages and generates personalized cold outreach messages using Claude or OpenAI-compatible APIs.

Built for **students and early-career professionals reaching out to investment bankers** — the message prompts encode IB networking norms: seniority-based greetings, humble one-line intros, specific personal hooks, and a casual 10-minute-call ask.

## Features

- **Auto-scrapes** LinkedIn profiles (name, title, company, experience, education)
- **4 message types**: Cold outreach, Thank-you, Follow-up, Circle back
- **Hook extraction**: AI finds 3-5 personal details from the profile to reference
- **Multiple variants**: Generate 1-5 message variants per request
- **Style learning**: Rate messages thumbs up/down to steer future generations
- **Editable output** with one-click copy and word count
- **Message history**: Browse and reuse past messages
- **Referral mode**: Mention a mutual contact as the opening hook
- **Multi-provider AI**: Anthropic (Claude), OpenAI, OpenRouter (which proxies most other providers)
- **Sender profile**: Import your own LinkedIn page or fill in manually
- **Resume context**: Paste your resume for richer shared-interest matching
- API key stored on your device in Chrome's local extension storage — sent only to your chosen AI provider

---

## Quick Install (no coding required)

If you just want to use ColdCraft without building from source:

1. Download the latest release zip from [Releases](https://github.com/HumbleOrigin/ColdCraft/releases)
2. Unzip the folder
3. Open Chrome and go to `chrome://extensions/`
4. Enable **Developer mode** (toggle in top right)
5. Click **Load unpacked** and select the unzipped folder
6. Navigate to any LinkedIn profile — the ColdCraft sidebar appears on the right

The extension will walk you through setting up your API key on first use.

---

## Getting Started (from source)

### 1. Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)

### 2. Install Dependencies

```bash
cd ColdCraft
pnpm install
```

### 3. Get an API Key

**Anthropic (default):**
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Navigate to **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-...`)

**OpenAI or compatible providers:**
1. Get a key from your provider's dashboard
2. In ColdCraft settings, switch to "OpenAI / Compatible" and set the Base URL if needed

### 4. Start Development Build

```bash
pnpm dev
```

This builds the extension into the `build/chrome-mv3-dev/` directory and watches for changes.

### 5. Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `build/chrome-mv3-dev/` folder
5. The ColdCraft extension will appear in your extensions list

### 6. Add Your API Key

After loading the extension:
- Click the ColdCraft extension icon in Chrome toolbar
- Click **Settings & API Key**
- Paste your API key and save

OR

- Navigate to any LinkedIn profile (`linkedin.com/in/...`)
- The sidebar appears on the right
- Open Settings (gear icon) and enter your API key

---

## Usage

1. Go to any LinkedIn profile page (e.g., `https://www.linkedin.com/in/username`)
2. The ColdCraft sidebar appears on the right side of the page
3. The extension automatically reads the profile and extracts hook details
4. Click a hook badge to prioritize it, or let the AI choose
5. Select a message type (Cold outreach, Thank-you, Follow-up, Circle back)
6. Optionally expand "More options" to add a referral name or extra context
7. Adjust variant count (1-5) and click **Generate Message**
8. Edit the generated message if needed, then **Copy** and paste into LinkedIn
9. Rate messages with thumbs up/down to improve future generations

---

## Building for Production

```bash
pnpm build
```

Output is in `build/chrome-mv3-prod/`. You can then zip this folder and upload to the Chrome Web Store.

---

## Project Structure

```
├── contents/
│   └── sidebar.tsx              # Injected sidebar UI (content script)
├── background/
│   ├── aiClient.ts              # Multi-provider AI client
│   └── messages/
│       ├── generateMessage.ts   # Message generation handler
│       ├── extractRecipientHooks.ts  # Hook detail extraction
│       └── extractSenderProfile.ts   # Sender profile extraction
├── options.tsx                  # Settings page (provider, API key, model)
├── popup.tsx                    # Extension popup (usage instructions)
├── package.json
├── tsconfig.json
├── DESIGN.md                    # Design system documentation
└── README.md
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Invalid API key (401)" | Your key is wrong or revoked. Create a new one from your provider's dashboard. |
| "Rate limited (429)" | Too many requests. Wait 30 seconds and try again. |
| "Insufficient credits" | Your account needs billing. Add a payment method in your provider's console. |
| Sidebar doesn't appear | Make sure you're on a `linkedin.com/in/...` profile page. Try refreshing the page. |
| "Failed to connect to background service" | Reload the extension: go to `chrome://extensions/`, find ColdCraft, click the refresh icon. |
| Profile data not loading | LinkedIn's page structure changes. Click "Rescrape" in the sidebar, or reload the LinkedIn page. |

---

## Notes

- The extension only activates on `https://www.linkedin.com/in/*` profile pages
- Your API key is stored in `chrome.storage.local` on this device only (it does not sync); non-secret settings like your sender profile use `chrome.storage.sync`
- The API key is only read from the background service worker — it never touches page context
- LinkedIn's DOM structure changes frequently; if scraping stops working, the extension will warn you and still allow generation with whatever data was found
- Each message costs roughly $0.002-$0.005 (less than a penny)

---

## Feedback

Found a bug or have a suggestion? [Open an issue](https://github.com/HumbleOrigin/ColdCraft/issues/new).
