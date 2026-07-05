# ColdCraft Design System

## Colors

### Background
- `#0A0F1E` — Primary background (all screens)
- `rgba(255,255,255,0.04)` — Card/section background
- `rgba(255,255,255,0.05)` — Input background
- `rgba(255,255,255,0.06)` — Divider

### Accent
- `#6C63FF` — Primary purple (buttons, focus rings, active states, logo, pull tab)
- `#7B74FF` — Purple hover
- `rgba(108,99,255,0.08)` — Purple tint background
- `rgba(108,99,255,0.15)` — Small button / chip background
- `rgba(108,99,255,0.2)` — Chip selected background, welcome card
- `rgba(108,99,255,0.25)` — Chip hover, badge background
- `rgba(108,99,255,0.35)` — Chip selected strong
- `rgba(108,99,255,0.4)` — Chip selected border
- `#A89EFF` — Light purple text (chips, secondary purple labels)

### Text (opacity scale on #fff)
- `1.0` — Headings, logo
- `0.88` — Body text (variant messages)
- `0.7` — Ghost button text
- `0.6` — Welcome text, step text
- `0.5` — Secondary text, subtitles, profile title
- `0.4` — Labels, gear buttons, timestamps
- `0.35` — Section headers, field labels, tertiary text
- `0.3` — Timestamps, no-profile text
- `0.25` — Disabled text, placeholders, disclaimers, footer

### Semantic
- `#5FD98C` — Success green (loaded indicator, copied badge)
- `#FFB84D` — Warning yellow
- `#FF8080` — Error red (text)
- `rgba(255,80,80,0.08)` — Error background
- `rgba(255,170,0,0.08)` — Warning background
- `rgba(95,217,140,0.08)` — Success background

### Borders
- `rgba(255,255,255,0.06)` — Divider, footer border
- `rgba(255,255,255,0.07)` — Card border, header divider
- `rgba(255,255,255,0.08)` — Section border, you-pill border
- `rgba(255,255,255,0.1)` — Input border, chip border, thumb button border
- `rgba(255,255,255,0.15)` — Ghost button border

## Typography

- **Font:** Inter (loaded from Google Fonts)
- **Fallback:** -apple-system, BlinkMacSystemFont, sans-serif

### Scale
| Use | Size | Weight | Tracking |
|-----|------|--------|----------|
| Page heading (options) | 22px | 700 | -0.5px |
| Logo text (options) | 18px | 700 | -0.5px |
| Welcome title | 14px | 600 | — |
| Profile name | 14px | 600 | — |
| Button primary | 13.5px | 600 | — |
| Logo text (sidebar) | 13px | 700 | -0.3px |
| Body / textarea / input | 12.5px | 400 | — |
| Secondary text | 12px | 400/600 | — |
| Chip text / small button | 11.5px | 400/600 | — |
| Small text / you-pill sub | 11px | 400/500 | — |
| Section label | 10px | 600 | 0.6-0.8px |
| Logo sub / micro text | 10px | 400/600 | 0.5px |
| Micro indicator | 9px | 600 | 0.5px |

## Spacing

- **Sidebar width:** min(360px, 90vw)
- **Page padding (sidebar):** 20px horizontal, 16px vertical
- **Page padding (options):** 24px horizontal, 48px vertical
- **Card padding:** 12-16px
- **Section gap:** 16px (sidebar scroll)
- **Input padding:** 10-12px horizontal, 9-10px vertical
- **Button padding:** 10-11px vertical, 12-20px horizontal

## Border Radius

| Element | Radius |
|---------|--------|
| Cards, sections | 10-12px |
| Buttons, inputs | 7-8px |
| Chips, badges | 20px (pill) |
| Logo icon | 7-9px |
| Avatar | 50% |
| Small controls | 4-6px |
| Pull tab | 12px 0 0 12px |

## Components

### Buttons
- **Primary:** `#6C63FF` bg, white text, 8px radius, hover `#7B74FF`, hover lifts 1px
- **Ghost:** transparent bg, white border at 0.15 opacity, 7-8px radius
- **Small (sm):** purple tint bg `rgba(108,99,255,0.15)`, light purple text `#A89EFF`, 6px radius

### Inputs
- Background: `rgba(255,255,255,0.05)`
- Border: `rgba(255,255,255,0.1)`, focus: `#6C63FF`
- Placeholder: `rgba(255,255,255,0.25)`

### Cards
- Background: `rgba(255,255,255,0.04)`
- Border: `rgba(255,255,255,0.07-0.08)`
- Radius: 10px

### Chips (message types, hook angles)
- Default: `rgba(255,255,255,0.05)` bg, `rgba(255,255,255,0.1)` border, `rgba(255,255,255,0.6)` text
- Active: `rgba(108,99,255,0.2)` bg, `rgba(108,99,255,0.4)` border, `#A89EFF` text
- Hook badges: `rgba(108,99,255,0.15)` bg, `rgba(108,99,255,0.25)` border, `#A89EFF` text

### Panels (Settings, History)
- Full-height slide-in from right
- Same `#0A0F1E` background
- Header with back arrow + title
- Transition: 0.25s cubic-bezier(0.4,0,0.2,1)

### Pull Tab
- Width: 44px, Height: 96px
- Background: `#6C63FF`, hover `#7B74FF`
- Border-radius: 12px 0 0 12px
- Shadow: `-4px 0 16px rgba(108,99,255,0.4)`
- Slides with sidebar open/close

## Animation

- **Sidebar:** 0.3s cubic-bezier(0.4, 0, 0.2, 1) translateX
- **Panel slide:** 0.25s cubic-bezier(0.4, 0, 0.2, 1) translateX
- **Hover transitions:** 0.15s ease
- **Skeleton shimmer:** 1.5s infinite linear gradient sweep
- **Pull tab hover:** width 44px → 48px
