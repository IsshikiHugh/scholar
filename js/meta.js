/**
 * meta.js — Shared metadata logic (browser + Node).
 *
 * Single source of truth for the document title, SEO/description, Open Graph /
 * Twitter cards, canonical URL, and schema.org Person JSON-LD, all derived from
 * contents/data.json.
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

    // Strip any HTML tags and collapse whitespace — descriptions stay plain text.
    function stripHtml(str) {
        return String(str == null ? '' : str)
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Resolve a possibly-relative path (e.g. "/assets/avatar.png") against the
    // site's base URL, so og:image is an absolute URL as crawlers require.
    function absoluteUrl(base, path) {
        if (!path) return '';
        if (/^https?:\/\//.test(path)) return path;
        if (!base) return path;
        return String(base).replace(/\/+$/, '') + '/' + String(path).replace(/^\/+/, '');
    }

    // Derive all metadata values from data.json. `origin` is a fallback base URL
    // used when data.site.url is absent (e.g. location.origin + pathname).
    function computeMeta(data, origin) {
        data = data || {};
        const profile = data.profile || {};
        const site = data.site || {};

        const name = site.title || profile.myName || '';
        const description = stripHtml(site.description || (profile.bio && profile.bio[0]) || '');
        const url = site.url || origin || '';
        const image = absoluteUrl(site.url, profile.avatar);
        const keywords = Array.isArray(site.keywords) ? site.keywords.filter(Boolean) : [];
        const sameAs = (profile.links || []).map(l => l && l.url).filter(Boolean);
        const email = (profile.email && profile.email.user && profile.email.domain)
            ? profile.email.user + '@' + profile.email.domain
            : '';

        return { name, description, url, image, keywords, sameAs, email };
    }

    // schema.org Person object (used for the JSON-LD block in both environments).
    function buildPerson(meta) {
        const person = { '@context': 'https://schema.org', '@type': 'Person' };
        if (meta.name) person.name = meta.name;
        if (meta.url) person.url = meta.url;
        if (meta.image) person.image = meta.image;
        if (meta.description) person.description = meta.description;
        if (meta.sameAs.length) person.sameAs = meta.sameAs;
        if (meta.email) person.email = 'mailto:' + meta.email;
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

        if (meta.name) lines.push(`<title>${escAttr(meta.name)}</title>`);
        if (meta.description) lines.push(`<meta name="description" content="${escAttr(meta.description)}">`);
        if (meta.keywords.length) lines.push(`<meta name="keywords" content="${escAttr(meta.keywords.join(', '))}">`);

        lines.push(`<meta property="og:type" content="profile">`);
        if (meta.name) lines.push(`<meta property="og:title" content="${escAttr(meta.name)}">`);
        if (meta.description) lines.push(`<meta property="og:description" content="${escAttr(meta.description)}">`);
        if (meta.url) lines.push(`<meta property="og:url" content="${escAttr(meta.url)}">`);
        if (meta.image) lines.push(`<meta property="og:image" content="${escAttr(meta.image)}">`);

        lines.push(`<meta name="twitter:card" content="summary">`);
        if (meta.name) lines.push(`<meta name="twitter:title" content="${escAttr(meta.name)}">`);
        if (meta.description) lines.push(`<meta name="twitter:description" content="${escAttr(meta.description)}">`);
        if (meta.image) lines.push(`<meta name="twitter:image" content="${escAttr(meta.image)}">`);

        if (meta.url) lines.push(`<link rel="canonical" href="${escAttr(meta.url)}">`);

        // Escape "<" inside JSON-LD to avoid any accidental "</script>" break-out.
        const jsonld = JSON.stringify(buildPerson(meta)).replace(/</g, '\\u003c');
        lines.push(`<script type="application/ld+json">${jsonld}</script>`);

        return lines.map(l => i + l).join('\n');
    }

    return { stripHtml, absoluteUrl, computeMeta, buildPerson, buildHeadHtml };
});
