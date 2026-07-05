# ColdCraft Privacy Policy

**Last updated:** July 5, 2026

## What ColdCraft does

ColdCraft is a Chrome extension that helps users write cold outreach messages for LinkedIn networking. It reads LinkedIn profile pages you visit, combines that with your own profile information, and sends both to your chosen AI provider's API (Anthropic by default; OpenAI-compatible providers are also supported) to generate a personalized message.

## Data we collect

**Your sender profile info** — name, school, year, current status, and target area. You enter this manually or import it from your own LinkedIn page. This is stored locally on your device using Chrome's built-in storage.

**Your API key** — stored on your device in Chrome's local extension storage (`chrome.storage.local`, which does not sync). It is only sent to your chosen AI provider to authenticate message generation requests.

**LinkedIn profile text** — when you visit a LinkedIn profile page, ColdCraft reads the visible text on that page. This text is sent to your chosen AI provider solely to generate a cold outreach message. It is not stored after the message is generated.

**Resume text (optional)** — if you paste your resume into the settings panel, it is stored locally on your device and sent to your chosen AI provider as part of the message generation prompt.

## Where data is sent

Data is sent to **one** external service: the API of the AI provider you configure (Anthropic's api.anthropic.com by default; alternatively OpenAI or an OpenAI-compatible endpoint such as OpenRouter). Your API key, sender profile, and the recipient's LinkedIn text are included in the API request. Your provider's own privacy policy governs how they handle API requests — for Anthropic: https://www.anthropic.com/privacy

**No data is sent anywhere else.** ColdCraft has no backend server, no analytics, no tracking, and no telemetry.

## Data storage

Your API key, resume text, LinkedIn profile context, and message history are stored on your device only, in `chrome.storage.local`. Your basic sender profile (name, school, year, target area) and non-secret settings use `chrome.storage.sync`, which Chrome may sync across your devices through your Google account. ColdCraft itself stores nothing on external servers.

## Data sharing

ColdCraft does not sell, transfer, or share user data with any third party. The only external transmission is to the Anthropic API for the purpose of generating messages, as described above.

## Data retention

All data remains on your device until you clear it. You can delete your stored information at any time through the extension's settings panel ("Clear my info") or by uninstalling the extension.

## Changes to this policy

If this policy changes, the updated version will be posted at this URL with a new "Last updated" date.

## Contact

If you have questions about this privacy policy, open an issue at https://github.com/aguitzkow/coldcraft or email jacksoncsoma@gmail.com.
