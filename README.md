# SCHH Community Guide

A mobile-first PWA for the SCHH Community Guide — a resident-created, AI-powered
guide to community information and local resources. Built with Jekyll (no theme,
no CSS/JS frameworks), hosted on GitHub Pages at <https://schh.info>.

## Architecture

**Chat-first app shell.** The front page *is* the chat ("Ask the Guide").
A bottom tab bar (phones) / top nav (larger screens) switches between four
screens, all rendered by the single layout `_layouts/app.html`:

| URL | Screen |
|---|---|
| `/` | Ask the Guide — chat client, fills the viewport |
| `/topics/` | "What can I ask?" cards from `_data/features.yml` |
| `/about/` | Long-form about from `_data/about.yml` |
| `/contact/` | Contact form (Netlify function endpoint) |
| `/chat/` | Redirect stub to `/` (kept for old shared links) |
| `/offline/` | Service-worker offline fallback |

**Chat client** (`js/guide-chat.js` + `css/guide-chat.css`) is a portable
component — its canonical copy lives in the `schh-community-guide` repo; the
copies here are drop-ins, **do not edit them in this repo**. It talks to the
resident-gated backend at `chatbot.url` (`_config.yml`, https://chat.schh.info):
email verified against the SCHH Resident Directory, six-digit emailed code,
60-day cookie session. The app shell themes it via the `--guide-*` CSS custom
properties and stretches it full-height with flex overrides in `css/app.css`
(the component itself is untouched).

**Design system** lives entirely in `css/app.css` (`:root` tokens): deep
coastal blue `#1B4965` on warm sand `#F6F3EC`, 18px base type, system font
stack, 48px touch targets — senior-friendly, WCAG AA+ contrast throughout.

**PWA layer:**
- `manifest.webmanifest` — installable, `standalone` display, "SCHH Guide"
- `sw.js` — hand-written service worker. Liquid stamps `site.time` into the
  cache name so every deploy ships a byte-different SW and retires old caches.
  Navigations are network-first with cache→`/offline/` fallback; static assets
  cache-first. **Never intercepts non-GET or cross-origin requests**, so the
  chat's cookie auth + SSE streaming and the contact form POST bypass it fully.
- Icons in `img/` are generated from the hand-authored `img/icon.svg`:
  ```bash
  qlmanage -t -s 512 -o /tmp img/icon.svg   # SVG → 512 PNG (macOS built-in)
  sips -z 192 192 /tmp/icon.svg.png --out img/icon-192.png   # etc.
  ```
  Maskable variants use the same art with square corners (`rx="0"`);
  `apple-touch-icon.png` is the 180px full-bleed version.

## Local development

```bash
bundle install
bundle exec jekyll serve
```
Open <http://localhost:4000>. The chat shows the sign-in card locally (the
backend's CORS allows schh.info, not localhost) — full chat flow is verified
on the deployed site.

## Deployment

Pushes to `main` deploy via GitHub Actions (`.github/workflows/pages.yml`,
Pages source = "GitHub Actions"). Rollback = revert the merge commit; the
service worker's network-first navigations make rollbacks safe.

## Content editing

- Topic cards: `_data/features.yml` · About copy: `_data/about.yml`
- Icon names in the data files map to inline SVGs in `_includes/icon.html`
- Site/nav/contact settings: `_config.yml`

## Disclaimer

This is an unofficial, resident-created resource. It is not affiliated with,
sponsored by, or endorsed by the Community Association or the developer.

Note: the community's CC&Rs restrict use of its full name in printed/promotional
material without the Declarant's written consent. Site copy avoids that phrase
throughout — refer to "the community" / "the Association" instead, both here
and in any new content.
