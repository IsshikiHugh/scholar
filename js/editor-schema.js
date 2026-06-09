/**
 * EDITOR_SCHEMA — Declarative schema for data.json
 *
 * Each entry maps to a top-level key in data.json and describes
 * the fields the editor should generate forms for.
 *
 * When the website structure changes:
 *   1. Update data.json with new fields
 *   2. Update/add render functions in renderer.js
 *   3. Update THIS file to match — the editor auto-adapts
 *
 * See docs/EDITOR.md for the full field type reference.
 */

const EDITOR_SCHEMA = [
    {
        key: "profile",
        label: "Profile",
        renderer: "renderProfile",
        fields: [
            {
                key: "myName",
                label: "My Name",
                type: "text",
                required: true,
                placeholder: "Yan Xia",
                description: "Your full name as it appears in author lists. Used to auto-highlight you in publications."
            },
            {
                key: "name",
                label: "Name Parts",
                type: "array",
                description: "Name displayed in the header. Each part can have a pronunciation tooltip.",
                itemSchema: {
                    type: "object",
                    fields: [
                        { key: "text", label: "Display Text", type: "text", required: true },
                        { key: "annotation", label: "Pronunciation", type: "text", required: false, placeholder: "e.g. [i-a-n]" }
                    ]
                }
            },
            {
                key: "nameCN",
                label: "Chinese Name",
                type: "text",
                required: false,
                description: "Chinese characters shown after the English name."
            },
            {
                key: "email",
                label: "Email",
                type: "object",
                description: "Split into user/domain to deter spam scrapers.",
                fields: [
                    { key: "user", label: "Username", type: "text", required: true, placeholder: "yan.xia" },
                    { key: "domain", label: "Domain", type: "text", required: true, placeholder: "utexas.edu" }
                ]
            },
            {
                key: "avatar",
                label: "Avatar Path",
                type: "text",
                required: true,
                placeholder: "/assets/avatar.png",
                description: "Path to the avatar image file."
            },
            {
                key: "bio",
                label: "Bio Paragraphs",
                type: "array",
                addPosition: "end",
                description: "Each item becomes a separate <p> paragraph.",
                itemSchema: { type: "textarea" }
            },
            {
                key: "links",
                label: "Profile Links",
                type: "array",
                addPosition: "end",
                description: "External links shown below the name (Google Scholar, GitHub, etc.).",
                itemSchema: {
                    type: "object",
                    fields: [
                        { key: "name", label: "Label", type: "text", required: true, placeholder: "Google Scholar" },
                        { key: "url", label: "URL", type: "url", required: true, placeholder: "https://..." }
                    ]
                }
            }
        ]
    },
    {
        key: "news",
        label: "News",
        renderer: "renderNews",
        fields: [
            {
                key: "_self",
                type: "array",
                description: "News items displayed in chronological order.",
                itemSchema: {
                    type: "object",
                    fields: [
                        { key: "date", label: "Date", type: "text", required: true, placeholder: "YYYY.MM" },
                        { key: "content", label: "Content", type: "textarea", required: true, description: "Use {TOKEN} for annotation tooltips." },
                        { key: "bold", label: "Bold", type: "toggle", required: false },
                        { key: "annotations", label: "Annotations", type: "keyvalue", required: false, description: "TOKEN → tooltip text. Tokens must match {TOKEN} in content." }
                    ]
                }
            }
        ]
    },
    {
        key: "publications",
        label: "Publications",
        renderer: "renderPublications",
        fields: [
            {
                key: "_self",
                type: "array",
                description: "Publication entries with teaser media, authors, and links.",
                itemSchema: {
                    type: "object",
                    labelKey: "title",
                    fields: [
                        {
                            key: "teaser",
                            label: "Teaser",
                            type: "object",
                            fields: [
                                { key: "type", label: "Type", type: "select", options: ["video", "image"], required: true },
                                { key: "src", label: "Source Path", type: "text", required: true, placeholder: "/assets/teasers/XXX.mp4" }
                            ]
                        },
                        { key: "title", label: "Title", type: "text", required: true },
                        {
                            key: "authors",
                            label: "Authors",
                            type: "array",
                            collapsible: true,
                            addPosition: "end",
                            showIndex: true,
                            connectionCheck: true,
                            itemSchema: {
                                type: "object",
                                fields: [
                                    { key: "name", label: "Name", type: "text", required: true },
                                    { key: "marker", label: "Marker", type: "text", required: false, flex: 0.2 }
                                ]
                            }
                        },
                        { key: "venue", label: "Venue", type: "text", required: true, placeholder: "e.g. CVPR" },
                        { key: "year", label: "Year", type: "number", required: true },
                        {
                            key: "tags",
                            label: "Tags",
                            type: "array",
                            required: false,
                            addPosition: "end",
                            description: "Pill-shaped tags shown after the venue (e.g. Oral Presentation, Award Candidate).",
                            itemSchema: { type: "text", placeholder: "e.g. Oral Presentation" }
                        },
                        { key: "links", label: "Links", type: "keyvalue", required: false, description: "Label → URL pairs." },
                        { key: "repo_id", label: "Repo ID", type: "text", required: false, placeholder: "user/repo" }
                    ]
                }
            }
        ]
    },
    {
        key: "experiences",
        label: "Experiences",
        renderer: "renderExperiences",
        fields: [
            {
                key: "education",
                label: "Education",
                type: "array",
                itemSchema: {
                    type: "object",
                    collapsible: true,
                    fields: [
                        { key: "period", label: "Period", type: "text", required: true, placeholder: "YY.MM-YY.MM or YY.MM-NOW" },
                        { key: "description", label: "Description", type: "textarea", required: true }
                    ]
                }
            },
            {
                key: "internships",
                label: "Internships",
                type: "array",
                itemSchema: {
                    type: "object",
                    collapsible: true,
                    fields: [
                        { key: "period", label: "Period", type: "text", required: true, placeholder: "YY.MM-YY.MM" },
                        { key: "description", label: "Description", type: "textarea", required: true }
                    ]
                }
            },
            {
                key: "services",
                label: "Services",
                type: "object",
                inline: false,
                fields: [
                    {
                        key: "conference_reviewer",
                        label: "Conference Reviewer",
                        type: "text",
                        required: false,
                        placeholder: "e.g. CVPR(2026)",
                        description: "Comma-separated list of conferences."
                    },
                    {
                        key: "journal_reviewer",
                        label: "Journal Reviewer",
                        type: "text",
                        required: false,
                        placeholder: "e.g. TPAMI",
                        description: "Comma-separated list of journals."
                    }
                ]
            }
        ]
    },
    {
        key: "connections",
        label: "Connections",
        renderer: null,
        fields: [
            {
                key: "_self",
                type: "keyvalue",
                description: "Collaborator Name → homepage URL. Names are auto-linked throughout the page."
            }
        ]
    },
    {
        key: "footer",
        label: "Footer",
        renderer: "renderFooter",
        fields: [
            {
                key: "lastUpdate",
                label: "Last Update",
                type: "text",
                required: true,
                placeholder: "YYYY.MM.DD",
                description: "Date shown in the page footer."
            }
        ]
    }
];
