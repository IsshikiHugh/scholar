# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Academic portfolio / personal homepage. Hosted on GitHub Pages.

## Tech Stack

Pure vanilla HTML5/CSS3/JavaScript — no frameworks, no bundlers, no package manager. There is no build step, no linting, and no tests.

## Development

Serve locally with any static file server (e.g. `python -m http.server` or VS Code Live Server). Open `index.html` as the entry point.

Deployment is direct push to `main` — GitHub Pages serves from the repo root.

## Architecture

**Config-driven content (`contents/data.json`):**
- All homepage content (profile, news, publications, experiences, projects, connections, footer) lives in a single JSON file
- `js/renderer.js` converts JSON data into HTML at runtime
- `loadHome()` in `js/navigation.js` fetches JSON, renders HTML, and applies auto-linking synchronously
- To update site content, edit `contents/data.json` — no HTML knowledge needed

**SPA-like routing without a framework:**
- `index.html` is the shell; non-home pages live in `html/` as HTML partials (e.g. `html/theme.html`)
- `js/navigation.js` — `loadContent(file)` fetches partials; `loadHome()` renders from JSON
- URL hash navigation (`#news`, `#pub`, `#exp`, `#cool`) for in-page section linking

**Custom HTML elements (CSS-styled, not Web Components):**
- `<iro-section>`, `<iro-section-head>`, `<iro-notice>` — styled via `css/page.css`

**Theme system (`js/themes.js`, `css/colors.css`):**
- 4 themes: `iro-bright`, `iro-town`, `iro-silent`, `iro-simple`
- CSS custom properties (`--iro-theme-color`, `--iro-bg-color`, etc.) swapped by toggling body class
- Persisted via `IRO_THEME` cookie

**Auto-linking (`js/connection.js`):**
- `ConnectionsDict` populated at runtime from `connections` in `data.json`
- `addConnectionLink()` scans text nodes and auto-wraps matching names in styled `<a>` tags

## Key Files

| Path | Purpose |
|---|---|
| `index.html` | App shell, script/style loading, Google Analytics |
| `contents/data.json` | All homepage content data (profile, news, pubs, etc.) |
| `js/renderer.js` | JSON → HTML rendering functions |
| `js/navigation.js` | Content loading / SPA routing (`loadHome()`, `loadContent()`) |
| `js/connection.js` | Collaborator name auto-linking |
| `js/themes.js` | Theme switching and cookie persistence |
| `css/colors.css` | Theme color variable definitions |
| `css/page.css` | Layout, custom elements, section styling |
| `css/publications.css` | Publication entry hover animations, teaser videos |
| `CNAME` | Custom domain config |
