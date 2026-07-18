/**
 * meta.js — Shared metadata logic (browser + Node).
 *
 * Single source of truth for the document title, Open Graph / Twitter title,
 * canonical URL, and a minimal schema.org Person JSON-LD block, all derived
 * from the existing contents/data.json fields (no metadata-only keys are added
 * to data.json).
 *
 *   - In the browser, `applyMeta()` in renderer.js uses `computeMeta()` and
 *     injects the tags into <head> at runtime (picked up by JS-rendering
 *     crawlers like Google).
 *   - In CI, scripts/inject-meta.js uses `computeMeta()` + `buildHeadHtml()` to
 *     write the tags statically into index.html, so social link-preview
 *     crawlers (which do NOT run JS) also see them.
 *
 * Keep this file dependency-free and DOM-free so both environments can use it.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.MetaKit = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {

    // Derive all metadata values from the existing data.json fields. `origin` is
    // the base URL used for og:url / canonical — location.origin in the browser,
    // or the CNAME domain at build time. Anything that can't be derived is empty.
    function computeMeta(data, origin) {
        data = data || {};
        const profile = data.profile || {};

        const name = profile.myName || '';
        const title = name ? `Homepage - ${name}` : 'Homepage';
        const url = origin || '';
        const sameAs = (profile.links || []).map(l => l && l.url).filter(Boolean);

        return { name, title, url, sameAs };
    }

    // schema.org Person object (used for the JSON-LD block in both environments).
    function buildPerson(meta) {
        const person = { '@context': 'https://schema.org', '@type': 'Person' };
        if (meta.name) person.name = meta.name;
        if (meta.url) person.url = meta.url;
        if (meta.sameAs.length) person.sameAs = meta.sameAs;
        return person;
    }

    function escAttr(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Build the static <head> HTML block for build-time injection.
    function buildHeadHtml(meta, indent) {
        const i = indent == null ? '        ' : indent;
        const lines = [];

        if (meta.title) lines.push(`<title>${escAttr(meta.title)}</title>`);

        lines.push(`<meta property="og:type" content="profile">`);
        if (meta.title) lines.push(`<meta property="og:title" content="${escAttr(meta.title)}">`);
        if (meta.url) lines.push(`<meta property="og:url" content="${escAttr(meta.url)}">`);

        lines.push(`<meta name="twitter:card" content="summary">`);
        if (meta.title) lines.push(`<meta name="twitter:title" content="${escAttr(meta.title)}">`);

        if (meta.url) lines.push(`<link rel="canonical" href="${escAttr(meta.url)}">`);

        // Escape "<" inside JSON-LD to avoid any accidental "</script>" break-out.
        const jsonld = JSON.stringify(buildPerson(meta)).replace(/</g, '\\u003c');
        lines.push(`<script type="application/ld+json">${jsonld}</script>`);

        return lines.map(l => i + l).join('\n');
    }

    return { computeMeta, buildPerson, buildHeadHtml };
});
