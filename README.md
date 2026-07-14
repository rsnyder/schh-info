# SCHH Community Guide

A Jekyll-powered landing page for the SCHH Community Guide, a resident-created AI-powered guide to community information, built on the [Agency Jekyll Theme](https://y7kim.github.io/agency-jekyll-theme/) and hosted via GitHub Pages.

## Quick-start checklist

### 1. Chatbot URL
The chatbot is a self-hosted [Dify Community Edition](https://github.com/langgenius/dify) app served at <https://chat.schh.info>. Access is restricted to residents: the user's email is verified against the SCHH Resident Directory, then a one-time access code is emailed (currently valid for 60 days).

The URL is set in `_config.yml`; the site's chatbot buttons link to it, and `/chat/` redirects there for older links:
```yaml
chatbot:
  url: "https://chat.schh.info"
```

### 2. Set up the contact form (Formspree)
The contact form uses [Formspree](https://formspree.io) for email delivery (required because GitHub Pages is static-only).

1. Create a free Formspree account at <https://formspree.io>
2. Click **New Form** and copy the Form ID (looks like `xabcdefg`)
3. In `_includes/contact.html`, replace `YOUR_FORM_ID`:
   ```html
   <form action="https://formspree.io/f/xabcdefg" method="POST">
   ```

### 3. Add a hero background image (optional)
The hero defaults to a dark coastal gradient. To use a photograph:
1. Add `img/hero-bg.jpg` to the repository (1920 × 1080 px recommended)
2. In `css/custom.css`, uncomment the `background-image` line under the `header` rule

### 4. Update site metadata
In `_config.yml`:
- `url` — your GitHub Pages URL (e.g. `https://your-org.github.io`)
- `baseurl` — subpath if deploying as a project site (e.g. `/schh-info`), or `""` for a root site
- `email` — contact email address
- `social` — social media links for the footer

## Local development

```bash
gem install bundler
bundle install
bundle exec jekyll serve
```
Then open <http://localhost:4000>.

## Deployment (GitHub Pages)

1. Push the repository to GitHub
2. Go to **Settings → Pages**
3. Set **Source** to `Deploy from a branch` → `main` → `/ (root)`
4. GitHub will build and publish the site automatically

The site uses `jekyll-remote-theme` to pull the Agency theme directly from GitHub, so no theme files need to be committed to this repo.

## Project structure

```
.
├── _config.yml          # Site settings, chatbot URL, social links
├── _layouts/
│   └── default.html     # Page layout (controls which sections appear)
├── _includes/
│   ├── head.html        # <head> — meta tags, CSS links
│   ├── header.html      # Navigation bar + hero section
│   ├── services.html    # "What Can I Ask?" features section
│   ├── about.html       # About the project (timeline)
│   ├── contact.html     # Contact form (Formspree)
│   ├── footer.html      # Footer
│   └── js.html          # JavaScript includes
├── css/
│   └── custom.css       # Hero background, button styles, overrides
├── img/                 # Place hero-bg.jpg here
├── index.html           # Entry point (just sets layout: default)
└── Gemfile
```

## Disclaimer

This is an unofficial, resident-created resource. It is not affiliated with, sponsored by, or endorsed by the Community Association or the developer.

Note: the community's CC&Rs restrict use of its full name in printed/promotional material without the Declarant's written consent. Site copy avoids that phrase throughout — refer to "the community" / "the Association" instead, both here and in any new content.
