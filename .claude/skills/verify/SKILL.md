---
name: verify
description: Build, serve, and visually verify the schh.info Jekyll PWA — mobile-emulated screenshots and service-worker offline probes via headless Chrome CDP.
---

# Verify schh.info

## Build & serve
```bash
bundle exec jekyll build            # clean build check
bundle exec jekyll serve --port 4400 --detach   # kill with: pkill -f "jekyll serve --port 4400"
```
Routes to check: `/`, `/topics/`, `/about/`, `/contact/`, `/offline/`, `/thanks/`, `/contact-error/`, `/chat/` (redirect stub to `/`), `/manifest.webmanifest`, `/sw.js`, plus a 404.

## Screenshots — use CDP, not plain `--screenshot`
**Gotcha:** macOS headless Chrome clamps the window to ~500px wide, so
`--window-size=390,...` silently renders at 500 and crops — phone layouts look
broken when they aren't. Use DevTools Protocol with
`Emulation.setDeviceMetricsOverride` (see `shot.py` pattern): launch Chrome
`--headless=new --remote-debugging-port=9333 --remote-allow-origins=*`, open a
tab via PUT `/json/new`, set metrics (390x844, mobile=True), navigate, wait
~2.5s for the chat JS to settle, `Page.captureScreenshot`. Needs
`websocket-client` in a venv (system pip is PEP-668 locked).

Also assert no horizontal overflow: `document.documentElement.scrollWidth === innerWidth`.

## Service worker offline probe
**Gotcha:** CDP `Network.emulateNetworkConditions offline=True` does NOT apply
to the service worker's own fetches (separate target) — offline tests pass
falsely. Instead kill the Jekyll server, then navigate:
- precached page (e.g. `/topics/`) → served from cache
- uncached page (e.g. `/thanks/`) → `/offline/` fallback ("You're offline")
Restart server (`--skip-initial-build`) and confirm normal pages return.
Use a fresh `--user-data-dir` per run so a stale SW/cache doesn't lie.

## Chat client
The chat on `/` talks to https://chat.schh.info with cookies; from localhost
the session check fails (CORS) which correctly shows the **Sign in** card —
that's the expected logged-out state, not a bug. Full OTP flow is only
verifiable on the deployed site.

## Copy audit
The community's full name must never appear in site copy (CC&R restriction):
`grep -ri "sun city" --exclude-dir=_site --exclude-dir=.git .` must be clean.
