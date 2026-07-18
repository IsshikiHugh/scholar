
// Attributes for every external link: open in a new tab, and drop the opener
// reference / referrer for security and performance.
const EXT_ATTR = 'target="_blank" rel="noopener noreferrer"';

function renderAnnotation(text, tooltip) {
    return `<div class="annotation">${text}<span class="annotation-text">${tooltip}</span></div>`;
}

function renderNewsContent(content, annotations) {
    if (!annotations) return content;
    return content.replace(/\{([\w-]+)\}/g, (_, token) => {
        const tooltip = annotations[token];
        if (tooltip) return renderAnnotation(token, tooltip);
        return token;
    });
}

// Venue list: [{ name, years: [{ year, url }] }] -> "CVPR (2026, 2027), ECCV (2026)"
// Years with a url become subtle links; a plain string is passed through untouched.
function renderServiceVenues(venues) {
    if (!venues) return '';
    if (typeof venues === 'string') return venues;
    return venues.map(v => {
        const years = (v.years || [])
            .filter(y => y && y.year)
            .map(y => y.url ? `<a class="subtle-link" href="${y.url}" ${EXT_ATTR}>${y.year}</a>` : y.year);
        return years.length ? `${v.name} (${years.join(', ')})` : v.name;
    }).join(', ');
}

let _myName = '';

function renderPubAuthors(authors) {
    return authors.map((a, i) => {
        let name = a.name;
        if (a.marker) name += `<sup>${a.marker}</sup>`;
        if (a.name === _myName) name = `<span class="me">${name}</span>`;
        return name + (i < authors.length - 1 ? ',\n                    ' : '');
    }).join('');
}

function renderPubLinks(links, repo_id) {
    links = links || {};
    const parts = [];
    const entries = Object.entries(links);
    entries.forEach(([label, url], i) => {
        parts.push(`<a href="${url}" ${EXT_ATTR}>${label}</a>`);
        if (i < entries.length - 1) parts.push('\n                /\n                ');
    });
    if (repo_id) {
        const codeUrl = links['code'] || `https://github.com/${repo_id}`;
        parts.push(`\n                <a href="${codeUrl}" ${EXT_ATTR}>\n                    <img src="https://img.shields.io/github/stars/${repo_id}?style=social" alt="GitHub stars" style="vertical-align:middle">\n                </a>`);
    }
    return parts.join('');
}

function renderNavNotice() {
    return `<iro-notice>
    <a href="#news"> News </a>
    /
    <a href="#pub"> Pub </a>
    /
    <a href="#exp"> Exp </a>
</iro-notice>`;
}

function renderProfile(profile) {
    const nameAnnotations = profile.name.map(
        n => n.annotation ? renderAnnotation(n.text, n.annotation) : n.text
    ).join('\n                    ');

    const linksHtml = profile.links.map(l => `<a href="${l.url}" ${EXT_ATTR}> ${l.name} </a>`).join('\n                    ・\n                    ');

    const bioHtml = profile.bio.map(p => `\n            <p>\n                ${p}\n            </p>`).join('');

    const nameCN = profile.nameCN ? ` / ${profile.nameCN}` : '';

    return `<iro-section>
    <a id="top"></a>

    <div class="profile-row">
        <!-- Left Part: Description -->
        <div class="profile-desc">
            <div class="profile-heading">
                <div class="profile-title">
                    <h2 class="profile-name">
                        ${nameAnnotations}${nameCN}
                    </h2>
                    <div class="profile-email">${profile.email.user}<span class="profile-at">@</span><i>${profile.email.domain}</i></div>
                </div>
                <iro-notice class="profile-links">
                    ${linksHtml}
                </iro-notice>
            </div>
${bioHtml}
        </div>
        <!-- Right Part: Avatar -->
        <div class="profile-avatar">
            <img class="profile-avatar-img" src="${profile.avatar}" alt="${profile.name.map(n => n.text).join(' ')}">
        </div>
    </div>
</iro-section>`;
}

function renderNews(news) {
    const items = news.map(item => {
        let content = renderNewsContent(item.content, item.annotations);
        if (item.bold) content = `<b>${content}</b>`;
        return `        <li class="news-item">\n            [${item.date}] ${content}\n        </li>`;
    }).join('\n');

    return `<iro-section>

    <iro-section-head id="news"> News </iro-section-head>

    <p>
${items}
    </p>

</iro-section>`;
}

function renderPublications(pubs) {
    const rows = pubs.map(pub => {
        const teaserTag = pub.teaser.type === 'video'
            ? `<video class="pub-teaser" src="${pub.teaser.src}" muted autoplay loop playsinline preload="metadata"></video>`
            : `<img class="pub-teaser" src="${pub.teaser.src}" alt="${pub.title}" loading="lazy">`;

        const tagsLine = (pub.tags && pub.tags.length)
            ? '\n                ' + pub.tags.map(t => `<span class="pub-tag">${t}</span>`).join('\n                ')
            : '';

        return `        <tr class="pub-one">
            <!-- Teaser -->
            <td class="pub-teaser-wrapper">
                ${teaserTag}
            </td>
            <!-- Description -->
            <td class="pub-desc-wrapper">
                <span class="pub-title">${pub.title}</span>
                <br>
                <span class="pub-authors">
                    ${renderPubAuthors(pub.authors)}
                </span>
                <br>
                <span class="pub-venue"><i>${pub.venue}</i>, ${pub.year}</span>${tagsLine}
                <br>
                ${renderPubLinks(pub.links, pub.repo_id)}
            </td>
        </tr>`;
    }).join('\n\n');

    return `<iro-section>
    <iro-section-head id="pub"> Publications </iro-section-head>

    <table>
        <!-- Pub -->

${rows}

    </table>
</iro-section>`;
}

function renderExperiences(exp) {
    const eduItems = exp.education.map(
        e => `            <li>\n                [${e.period}] ${e.description}\n            </li>`
    ).join('\n');

    const internItems = exp.internships.map(
        e => `            <li>\n                [${e.period}] ${e.description}\n            </li>`
    ).join('\n');

    return `<iro-section>
    <iro-section-head id="exp"> Experiences </iro-section-head>

    <p>
        <b>Education</b>:
        <ul>
${eduItems}
        </ul>
    </p>

    <p>
        <b>Internships</b>:
        <ul>
${internItems}
        </ul>
    </p>

    <p>
        <b>Conference Reviewer</b>: ${renderServiceVenues(exp.services.conference_reviewer)}.<br>
        <b>Journal Reviewer</b>: ${renderServiceVenues(exp.services.journal_reviewer)}.
    </p>
</iro-section>`;
}

function renderFooter(footer) {
    return `<iro-notice> Last Update: ${footer.lastUpdate} </iro-notice>
<iro-notice> Designed by <a href="https://scholar.isshikih.top/" ${EXT_ATTR}>Yan XIA</a> @ <a href="https://github.com/IsshikiHugh/scholar" ${EXT_ATTR}>IsshikiHugh/scholar</a> </iro-notice>`;
}

function renderHome(data) {
    _myName = (data.profile && data.profile.myName) || '';
    return [
        renderNavNotice(),
        '',
        '',
        renderProfile(data.profile),
        '',
        '',
        renderNews(data.news),
        '',
        '',
        renderPublications(data.publications),
        '',
        '',
        renderExperiences(data.experiences),
        '',
        renderFooter(data.footer),
    ].join('\n');
}

// ─── Document metadata (SEO / social cards) ─────────────────────────
//
// Generated from data.json at runtime so the site stays config-driven. Values
// are computed by MetaKit (js/meta.js), the same module the CI injector uses,
// so runtime and build-time output never drift.
//
// NOTE: these tags are injected by JavaScript, so JS-rendering crawlers (e.g.
// Google) pick them up, but social link-preview crawlers (Twitter/X, Slack,
// Facebook) generally do NOT run JS. scripts/inject-meta.js writes the same
// tags statically into index.html at deploy time to cover those crawlers.

function _upsertHeadEl(selector, create) {
    let el = document.head.querySelector(selector);
    if (!el) {
        el = create();
        document.head.appendChild(el);
    }
    return el;
}

function _setNamedMeta(name, content) {
    if (!content) return;
    const el = _upsertHeadEl(`meta[name="${name}"]`, () => {
        const m = document.createElement('meta');
        m.setAttribute('name', name);
        return m;
    });
    el.setAttribute('content', content);
}

function _setPropMeta(property, content) {
    if (!content) return;
    const el = _upsertHeadEl(`meta[property="${property}"]`, () => {
        const m = document.createElement('meta');
        m.setAttribute('property', property);
        return m;
    });
    el.setAttribute('content', content);
}

function applyMeta(data) {
    const meta = MetaKit.computeMeta(data, location.origin + location.pathname);

    if (meta.title) document.title = meta.title;

    _setPropMeta('og:type', 'profile');
    _setPropMeta('og:title', meta.title);
    _setPropMeta('og:url', meta.url);

    _setNamedMeta('twitter:card', 'summary');
    _setNamedMeta('twitter:title', meta.title);

    if (meta.url) {
        const link = _upsertHeadEl('link[rel="canonical"]', () => {
            const l = document.createElement('link');
            l.setAttribute('rel', 'canonical');
            return l;
        });
        link.setAttribute('href', meta.url);
    }

    // schema.org Person JSON-LD.
    let script = document.getElementById('jsonld-person');
    if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = 'jsonld-person';
        document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(MetaKit.buildPerson(meta));
}
