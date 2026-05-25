# Visual Content Editor Documentation

This document covers everything needed to understand, use, and extend the content editor.

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Data Schema Reference](#2-data-schema-reference)
3. [Editor Architecture](#3-editor-architecture)
4. [Adding a New Section](#4-adding-a-new-section)
5. [Adding a New Field Type](#5-adding-a-new-field-type)
6. [Mapping Table](#6-mapping-table)

---

## 1. Quick Start

1. Start a local server in the project root:
   ```bash
   python -m http.server
   ```
2. Open `http://localhost:8000/editor.html` in a browser — the editor automatically loads `contents/data.json`
3. Use the left-side tabs to navigate between sections (Profile, News, Publications, etc.)
4. Edit fields in the form — the right panel shows a live preview
5. Click **"Copy JSON"** to copy the edited data to your clipboard, then paste it into `contents/data.json` to save

---

## 2. Data Schema Reference

### `profile` — Profile section

| Field Path | Type | Required | Description |
|---|---|---|---|
| `profile.myName` | `string` | yes | Your full name as it appears in author lists. Used to auto-highlight you in publications |
| `profile.name` | `Array<{text, annotation}>` | yes | Name parts displayed in the header. Each part has display text and optional pronunciation tooltip |
| `profile.name[].text` | `string` | yes | The display text of one name part (e.g. "Yan") |
| `profile.name[].annotation` | `string` | no | Pronunciation hint shown on hover (e.g. "[i-a-n]") |
| `profile.nameCN` | `string` | no | Chinese name shown after English name |
| `profile.email.user` | `string` | yes | Email username (before @) |
| `profile.email.domain` | `string` | yes | Email domain (after @) |
| `profile.avatar` | `string` | yes | Path to avatar image file |
| `profile.bio` | `Array<string>` | yes | Each string becomes a `<p>` paragraph |
| `profile.links` | `Array<{name, url}>` | yes | External links (Google Scholar, GitHub, etc.) |
| `profile.links[].name` | `string` | yes | Link display label |
| `profile.links[].url` | `string` | yes | Link URL |

### `news` — News section

| Field Path | Type | Required | Description |
|---|---|---|---|
| `news[]` | `Array<object>` | — | Array of news items |
| `news[].date` | `string` | yes | Date string (e.g. "2025.02") |
| `news[].content` | `string` | yes | News text. Use `{TOKEN}` for annotation tooltips |
| `news[].bold` | `boolean` | no | If true, the entire item is bold |
| `news[].annotations` | `Object<string, string>` | no | Map of TOKEN to tooltip text. Tokens must match `{TOKEN}` in content |

### `publications` — Publications section

| Field Path | Type | Required | Description |
|---|---|---|---|
| `publications[]` | `Array<object>` | — | Array of publication entries |
| `publications[].teaser.type` | `"video" \| "image"` | yes | Teaser media type |
| `publications[].teaser.src` | `string` | yes | Path to teaser file |
| `publications[].title` | `string` | yes | Paper title |
| `publications[].authors` | `Array<{name, marker?}>` | yes | Author list. Author matching `profile.myName` is auto-highlighted |
| `publications[].authors[].name` | `string` | yes | Author name. If matches `profile.myName`, rendered as "me" (bold) |
| `publications[].authors[].marker` | `string` | no | Superscript marker (e.g. "*" for equal contribution) |
| `publications[].venue` | `string` | yes | Conference/journal name |
| `publications[].year` | `number` | yes | Publication year |
| `publications[].tags` | `Array<string>` | no | Pill-shaped tags shown after the venue (e.g. `["Oral Presentation", "Award Candidate"]`) |
| `publications[].links` | `Object<string, string>` | no | Map of link label to URL |
| `publications[].repo_id` | `string` | no | GitHub repo ID (e.g. "user/repo") for stars badge |

### `experiences` — Experiences section

| Field Path | Type | Required | Description |
|---|---|---|---|
| `experiences.education` | `Array<{period, description}>` | yes | Education entries |
| `experiences.education[].period` | `string` | yes | Time period (e.g. "21.09-25.06") |
| `experiences.education[].description` | `string` | yes | Description text |
| `experiences.internships` | `Array<{period, description}>` | yes | Internship entries (same format) |
| `experiences.services` | `string` | no | Conference reviewer list (e.g. "CVPR(2026)") |

### `projects` — Cool Stuff section

| Field Path | Type | Required | Description |
|---|---|---|---|
| `projects[]` | `Array<{name, url, description}>` | — | Project entries |
| `projects[].name` | `string` | yes | Project name |
| `projects[].url` | `string` | yes | Project URL |
| `projects[].description` | `string` | yes | Project description |

### `connections` — Auto-linking

| Field Path | Type | Required | Description |
|---|---|---|---|
| `connections` | `Object<string, string>` | — | Map of collaborator name to homepage URL. Names are auto-linked when they appear in text throughout the page |

### `footer` — Footer

| Field Path | Type | Required | Description |
|---|---|---|---|
| `footer.lastUpdate` | `string` | yes | Last update date shown in footer |

---

## 3. Editor Architecture

### File Overview

| File | Role |
|---|---|
| `editor.html` | Standalone page shell (toolbar, tabs, form panel, preview panel) |
| `js/editor-schema.js` | Declarative schema describing every data.json field |
| `js/editor.js` | Editor engine: form generation, state management, copy to clipboard, preview |
| `css/editor.css` | Editor-specific styles (uses existing CSS variables for theme consistency) |

### Data Flow

```
  ┌─────────────┐         fetch             ┌──────────────┐
  │ data.json   │ ──────────────────────── > │ editorState  │
  └─────────────┘                            │ (JS object)  │
                                             └──────┬───────┘
                                                    │
                                     ┌──────────────┼──────────────┐
                                     │              │              │
                                     v              v              v
                              ┌────────────┐ ┌────────────┐ ┌────────────┐
                              │ Form UI    │ │ Preview    │ │ Copy JSON  │
                              │ (auto-gen  │ │ renderHome │ │ JSON.stri- │
                              │  from      │ │ (editorSt- │ │ ngify +   │
                              │  schema)   │ │  ate)      │ │ Clipboard │
                              └────────────┘ └────────────┘ └────────────┘
```

### Schema-Driven Design

The key architectural decision: **the editor does NOT hard-code form fields**. Instead:

1. `EDITOR_SCHEMA` (in `editor-schema.js`) declares every field's type, label, and constraints
2. `editor.js` reads the schema and generates form controls at runtime
3. When data.json structure changes, you update the schema — the editor adapts automatically

### Preview Mechanism

The preview reuses the existing `renderHome()` function from `renderer.js`. This guarantees pixel-perfect fidelity because it's the exact same rendering pipeline used by the production site.

```javascript
function updatePreview() {
    document.getElementById('editor-preview').innerHTML = renderHome(editorState);
    ConnectionsDict = editorState.connections || {};
    addConnectionLink(document.getElementById('editor-preview'));
}
```

Preview updates are debounced (300ms) to avoid performance issues during rapid typing.

---

## 4. Adding a New Section

When the website adds a new top-level section to data.json:

### Step 1: Add data to `contents/data.json`

```json
{
    "existingSection": { ... },
    "newSection": {
        "title": "My New Section",
        "items": [...]
    }
}
```

### Step 2: Create a render function in `js/renderer.js`

```javascript
function renderNewSection(data) {
    return `<iro-section>
        <iro-section-head id="new"> ${data.title} </iro-section-head>
        <p>${data.items.map(i => `<li>${i}</li>`).join('')}</p>
    </iro-section>`;
}
```

### Step 3: Add to `renderHome()` in `js/renderer.js`

```javascript
function renderHome(data) {
    return [
        // ... existing sections ...
        renderNewSection(data.newSection),  // <-- add here
        renderFooter(data.footer),
    ].join('\n');
}
```

### Step 4: Add schema in `js/editor-schema.js`

Add a new entry to the `EDITOR_SCHEMA` array:

```javascript
{
    key: "newSection",
    label: "New Section",
    renderer: "renderNewSection",
    fields: [
        { key: "title", label: "Title", type: "text", required: true },
        {
            key: "items",
            label: "Items",
            type: "array",
            itemSchema: { type: "text" }
        }
    ]
}
```

### Step 5: Done

No changes needed in `editor.js` — it reads the schema automatically. The editor will show a new tab with the correct form fields, and the preview will render it.

### Step 6: Update this documentation

Add the new section to the [Data Schema Reference](#2-data-schema-reference) and [Mapping Table](#6-mapping-table).

---

## 5. Adding a New Field Type

If you need a form control not covered by the existing types (`text`, `textarea`, `number`, `url`, `toggle`, `select`, `object`, `array`, `keyvalue`):

### Step 1: Add render function in `js/editor.js`

```javascript
function renderColorField(schema, value, path) {
    const wrapper = createFieldWrapper(schema);
    const input = document.createElement('input');
    input.type = 'color';
    input.value = value || '#000000';
    input.addEventListener('input', () => {
        setNestedValue(editorState, path, input.value);
        markDirty();
    });
    wrapper.appendChild(input);
    return wrapper;
}
```

### Step 2: Register in the `renderField()` dispatcher

```javascript
function renderField(schema, value, path) {
    switch (schema.type) {
        // ... existing cases ...
        case 'color': return renderColorField(schema, value, path);
        default:      return renderTextField(schema, value, path);
    }
}
```

### Step 3: Add default value in `createDefaultValue()`

```javascript
case 'color':
    return '#000000';
```

### Step 4: Use in schema

```javascript
{ key: "themeColor", label: "Theme Color", type: "color", required: true }
```

### Step 5: Update this documentation

Add the new type to the field type table below.

### Field Type Reference

| Type | Form Control | Schema Properties | Description |
|---|---|---|---|
| `text` | `<input type="text">` | `placeholder` | Single-line text |
| `textarea` | `<textarea>` | `placeholder` | Multi-line text |
| `number` | `<input type="number">` | `placeholder` | Numeric value |
| `url` | `<input type="url">` | `placeholder` | URL string |
| `toggle` | `<input type="checkbox">` | — | Boolean on/off |
| `select` | `<select>` | `options: string[]` | Dropdown from options |
| `array` | Repeatable group | `itemSchema` | List with add/remove/reorder |
| `object` | Grouped sub-fields | `fields: FieldSchema[]` | Nested object |
| `keyvalue` | Dynamic key-value pairs | — | Arbitrary string-to-string map |

Common properties available on all types:
- `key` (string, required): data.json field name
- `label` (string): Display label
- `type` (string, required): One of the types above
- `required` (boolean): Show required indicator, checked on export
- `description` (string): Help text shown below the label
- `placeholder` (string): Input placeholder text

Array schema additional properties:
- `labelKey` (string): Field key used as the collapsible header label (e.g. `"title"` for publications). When set, the item is rendered as a collapsible card with that field's value as the header
- `addPosition` (`"end"`): Place the Add button at the bottom and append new items (default: top/prepend)
- `showIndex` (boolean): Show a numbered badge before each array item
- `collapsible` (boolean, on array): Wrap the entire array in a collapsible section with item count (e.g. the authors sub-array inside publications)
- `connectionCheck` (boolean): Show a colored dot per item indicating if the name is found in `connections`
- `flex` (number, on field): Custom flex ratio for inline object fields (e.g. `0.15` for narrow columns)

`itemSchema`-level properties (set inside `itemSchema` when `itemSchema.type` is `"object"`):
- `itemSchema.labelKey` (string): Use a specific field as the collapsible header label. Items are rendered as collapsible cards
- `itemSchema.collapsible` (boolean): Force each item to render as a collapsible card even when the object has ≤ 3 fields (e.g. education/internships with only `period` + `description`). Without this flag, objects with ≤ 3 simple fields render inline

Default collapse behavior: all collapsible items (both item-level cards and `collapsible` array sections) start **collapsed**.

Summary format: when no `labelKey` is set, the header displays `[field1] field2` using the first two non-empty string values. `{TOKEN}` braces in values are automatically stripped (e.g. `{CVPR}` → `CVPR`).

---

## 6. Mapping Table

Complete mapping from data.json fields to renderer functions and editor schema.

| data.json Path | Renderer Function | Editor Tab | Editor Field Type |
|---|---|---|---|
| `profile` | `renderProfile()` | Profile | — |
| `profile.myName` | `renderPubAuthors()` (via global `_myName`) | Profile | `text` |
| `profile.name` | `renderProfile()` + `renderAnnotation()` | Profile | `array<object>` |
| `profile.name[].text` | inline in renderProfile | Profile | `text` |
| `profile.name[].annotation` | `renderAnnotation()` | Profile | `text` |
| `profile.nameCN` | `renderProfile()` | Profile | `text` |
| `profile.email` | `renderProfile()` | Profile | `object` |
| `profile.email.user` | `renderProfile()` | Profile | `text` |
| `profile.email.domain` | `renderProfile()` | Profile | `text` |
| `profile.avatar` | `renderProfile()` | Profile | `text` |
| `profile.bio` | `renderProfile()` | Profile | `array<textarea>` |
| `profile.links` | `renderProfile()` | Profile | `array<object>` |
| `profile.links[].name` | `renderProfile()` | Profile | `text` |
| `profile.links[].url` | `renderProfile()` | Profile | `url` |
| `news[]` | `renderNews()` | News | `array<object>` |
| `news[].date` | `renderNews()` | News | `text` |
| `news[].content` | `renderNewsContent()` | News | `textarea` |
| `news[].bold` | `renderNews()` | News | `toggle` |
| `news[].annotations` | `renderNewsContent()` + `renderAnnotation()` | News | `keyvalue` |
| `publications[]` | `renderPublications()` | Publications | `array<object>` |
| `publications[].teaser` | `renderPublications()` | Publications | `object` |
| `publications[].teaser.type` | `renderPublications()` | Publications | `select` |
| `publications[].teaser.src` | `renderPublications()` | Publications | `text` |
| `publications[].title` | `renderPublications()` | Publications | `text` |
| `publications[].authors` | `renderPubAuthors()` | Publications | `array<object>` (collapsible, showIndex, connectionCheck) |
| `publications[].authors[].name` | `renderPubAuthors()` | Publications | `text` (auto-highlighted if matches `profile.myName`) |
| `publications[].authors[].marker` | `renderPubAuthors()` | Publications | `text` |
| `publications[].venue` | `renderPublications()` | Publications | `text` |
| `publications[].year` | `renderPublications()` | Publications | `number` |
| `publications[].tags` | `renderPublications()` | Publications | `array<text>` |
| `publications[].links` | `renderPubLinks()` | Publications | `keyvalue` |
| `publications[].repo_id` | `renderPubLinks()` | Publications | `text` |
| `experiences.education` | `renderExperiences()` | Experiences | `array<object>` (collapsible) |
| `experiences.education[].period` | `renderExperiences()` | Experiences | `text` |
| `experiences.education[].description` | `renderExperiences()` | Experiences | `textarea` |
| `experiences.internships` | `renderExperiences()` | Experiences | `array<object>` (collapsible) |
| `experiences.internships[].period` | `renderExperiences()` | Experiences | `text` |
| `experiences.internships[].description` | `renderExperiences()` | Experiences | `textarea` |
| `experiences.services` | `renderExperiences()` | Experiences | `text` |
| `projects[]` | `renderProjects()` | Cool Stuff | `array<object>` |
| `projects[].name` | `renderProjects()` | Cool Stuff | `text` |
| `projects[].url` | `renderProjects()` | Cool Stuff | `url` |
| `projects[].description` | `renderProjects()` | Cool Stuff | `textarea` |
| `connections` | `addConnectionLink()` | Connections | `keyvalue` |
| `footer.lastUpdate` | `renderFooter()` | Footer | `text` |
