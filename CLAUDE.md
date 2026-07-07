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
- In-page section anchors (`#news`, `#pub`, `#exp`) are plain fragment jumps to section IDs — there is no hash-router, just native anchor scrolling

**Custom HTML elements (CSS-styled, not Web Components):**
- `<iro-section>`, `<iro-section-head>`, `<iro-notice>` — styled via `css/page.css`

**Theme system (`js/themes.js`, `css/colors.css`):**
- 4 themes: `iro-bright`, `iro-town`, `iro-silent`, `iro-simple`
- CSS custom properties (`--iro-theme-color`, `--iro-bg-color`, etc.) swapped by toggling body class
- Persisted via `IRO_THEME` cookie

**Auto-linking (`js/connection.js`):**
- `ConnectionsDict` populated at runtime from `connections` in `data.json`
- `addConnectionLink()` scans text nodes and auto-wraps matching names in styled `<a>` tags (regex metacharacters in names are escaped; longer names match before shorter prefixes)

**Content editor (`editor.html`, separate from the main site):**
- Schema-driven form UI for editing `data.json` without touching JSON by hand
- `js/editor-schema.js` (`EDITOR_SCHEMA`) declaratively describes every field; `js/editor.js` auto-generates the form and a live preview by reusing `renderHome()` from `renderer.js`
- Output is copied to clipboard via "Copy JSON" — the editor does **not** write files; paste the result back into `contents/data.json`
- Styled by `css/editor.css`. See `docs/EDITOR.md` for the field-type reference and extension guide

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
| `editor.html` | Content editor shell (schema-driven form + live preview) |
| `js/editor-schema.js` | `EDITOR_SCHEMA` — declarative field definitions for the editor |
| `js/editor.js` | Editor engine: form generation, state, live preview, Copy JSON |
| `css/editor.css` | Editor UI styling (only file with responsive `@media` rules) |
| `docs/EDITOR.md` | Editor architecture & extension guide |
| `CNAME` | Custom domain config |
