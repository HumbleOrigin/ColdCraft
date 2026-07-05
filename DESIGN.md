# ColdCraft Design System

## Colors

### Background
- `#0A0F1E` — Primary background (all screens)
- `rgba(255,255,255,0.04)` — Card/section background
- `rgba(255,255,255,0.05)` — Input background
- `rgba(255,255,255,0.06)` — Divider

### Accent
- `#2563EB` — Primary blue (buttons, focus rings, active states)
- `#3b7cf7` — Blue hover
- `rgba(37,99,235,0.08)` — Blue tint background
- `rgba(37,99,235,0.12)` — Chip background
- `rgba(37,99,235,0.2)` — Blue border (subtle)
- `rgba(37,99,235,0.35)` — Chip selected background
- `#93c5fd` — Light blue text (chips, secondary blue)

### Text (opacity scale on #fff)
- `1.0` — Headings, logo
- `0.87` — Body text (variant messages)
- `0.8` — Chip labels, interactive text
- `0.65` — Ghost button text
- `0.45` — Secondary text, subtitles
- `0.35` — Labels, section headers, field labels
- `0.3` — Tertiary text, timestamps
- `0.25` — Disabled text, placeholders, disclaimers
- `0.22` — Input placeholders

### Semantic
- `#4ade80` — Success green (loaded indicator)
- `#fbbf24` — Warning yellow
- `#f87171` — Error red
- `rgba(239,68,68,0.08)` — Error background
- `rgba(251,191,36,0.08)` — Warning background
- `rgba(95,217,140,0.08)` — Success background

### Borders
- `rgba(255,255,255,0.07)` — Card border, header divider
- `rgba(255,255,255,0.08)` — Section border
- `rgba(255,255,255,0.1)` — Input border, chip border
- `rgba(255,255,255,0.14)` — Ghost button border

## Typography

- **Font:** Inter (loaded from Google Fonts)
- **Fallback:** -apple-system, BlinkMacSystemFont, sans-serif

### Scale
| Use | Size | Weight | Tracking |
|-----|------|--------|----------|
| Page heading (options) | 22px | 700 | -0.5px |
| Logo text (options) | 18px | 700 | -0.5px |
| Profile name | 14px | 600 | — |
| Logo text (sidebar) | 13px | 700 | -0.3px |
| Button primary | 13.5px | 600 | — |
| Button / input text | 13px | 600/400 | — |
| Body / textarea | 12.5px | 400 | — |
| Secondary text | 12px | 400/600 | — |
| Chip text | 11.5px | 400 | — |
| Small text | 11px | 400/500 | — |
| Section label | 10px | 600 | 0.6-0.8px |
| Micro text | 9-10px | 600 | 0.5px |

## Spacing

- **Sidebar width:** min(360px, 90vw)
- **Page padding:** 14-16px horizontal, 14px vertical
- **Card padding:** 11-14px
- **Section gap:** 14px
- **Input padding:** 8-10px horizontal, 9-11px vertical
- **Button padding:** 10-11px vertical, 12-20px horizontal

## Border Radius

| Element | Radius |
|---------|--------|
| Cards, sections | 10-12px |
| Buttons, inputs | 7-8px |
| Chips | 20px (pill) |
| Logo icon | 7-9px |
| Avatar | 50% |
| Small controls | 4-6px |

## Components

### Buttons
- **Primary:** `#2563EB` bg, white text, 8px radius, hover lifts 1px
- **Ghost:** transparent bg, white border at 0.14 opacity, 7px radius
- **Small (sm):** blue tint bg, light blue text, 6px radius

### Inputs
- Background: `rgba(255,255,255,0.05)`
- Border: `rgba(255,255,255,0.1)`, focus: `#2563EB`
- Placeholder: `rgba(255,255,255,0.22)`

### Cards
- Background: `rgba(255,255,255,0.04)`
- Border: `rgba(255,255,255,0.07-0.08)`
- Radius: 10px

### Chips (hook angles)
- Background: `rgba(37,99,235,0.12)`, selected: `rgba(37,99,235,0.35)`
- Border: `rgba(37,99,235,0.25)`, selected: `#2563EB`
- Pill shape: 20px radius

### Panels (Settings, History)
- Full-height slide-in from right
- Same `#0A0F1E` background
- Header with back arrow + title
- Transition: 0.25s cubic-bezier(0.4,0,0.2,1)

## Animation

- **Sidebar:** 0.3s cubic-bezier(0.4, 0, 0.2, 1) translateX
- **Panel slide:** 0.25s cubic-bezier(0.4, 0, 0.2, 1) translateX
- **Hover transitions:** 0.15s ease
- **Skeleton shimmer:** 1.5s infinite linear gradient sweep
- **Pull tab hover:** width 44px → 48px
