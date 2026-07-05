# ColdCraft — LinkedIn Cold Message Generator

An AI-powered Chrome extension that injects a polished sidebar into LinkedIn profile pages and uses the Claude API to generate personalized cold outreach messages.

## Features

- 🔍 **Auto-scrapes** LinkedIn profiles (name, title, company, skills, experience, education)
- ✦ **4 message goals**: Networking, Job Inquiry, Sales, Partnership
- 🎛 **Tone & length controls**: Casual/Professional/Friendly × Short/Medium/Long
- 📝 **Editable output** with one-click copy
- 🔄 **Regenerate** with same settings
- 🔒 API key stored securely in Chrome sync storage

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
cd linkedin-cold-message
pnpm install
```

### 3. Get an Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Navigate to **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-...`)

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
- Paste your Anthropic API key and save

OR

- Navigate to any LinkedIn profile (`linkedin.com/in/...`)
- The sidebar appears on the right
- Enter your API key directly in the sidebar's inline prompt

---

## Usage

1. Go to any LinkedIn profile page (e.g., `https://www.linkedin.com/in/username`)
2. The ColdCraft sidebar appears on the right side of the page
3. The extension automatically reads the profile data
4. Select your **goal**, **tone**, and **length**
5. Optionally add custom context in the textarea
6. Click **✦ Generate Message**
7. Edit the generated message if needed, then **Copy** and paste into LinkedIn

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
│   └── sidebar.tsx          # Injected sidebar UI (content script)
├── background/
│   └── messages/
│       └── generateMessage.ts  # Service worker handling API calls
├── options.tsx              # Settings page for API key management
├── popup.tsx                # Extension popup (usage instructions)
├── package.json
├── tsconfig.json
└── README.md
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Invalid API key (401)" | Your key is wrong or revoked. Go to [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) and create a new one. |
| "Rate limited (429)" | Too many requests. Wait 30 seconds and try again. |
| "Insufficient credits" | Your account needs billing. Add a payment method at [console.anthropic.com/settings/billing](https://console.anthropic.com/settings/billing). |
| Sidebar doesn't appear | Make sure you're on a `linkedin.com/in/...` profile page. Try refreshing the page. |
| "Failed to connect to background service" | Reload the extension: go to `chrome://extensions/`, find ColdCraft, click the refresh icon. |
| Profile data not loading | LinkedIn's page structure changes. Click "Rescrape" in the sidebar, or reload the LinkedIn page. |

---

## Notes

- The extension only activates on `https://www.linkedin.com/in/*` profile pages
- Your API key is stored in `chrome.storage.sync` and syncs across your Chrome profile
- The API key is only read from the background service worker — it never touches page context
- LinkedIn's DOM structure changes frequently; if scraping stops working, the extension will warn you and still allow generation with whatever data was found
- Each message costs roughly $0.002-$0.005 (less than a penny)

---

## Feedback

Found a bug or have a suggestion? [Open an issue](https://github.com/HumbleOrigin/ColdCraft/issues/new).
