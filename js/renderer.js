
function renderAnnotation(text, tooltip) {
    return `<div class="annotation">${text}<span class="annotation-text">${tooltip}</span></div>`;
}

function renderNewsContent(content, annotations) {
    if (!annotations) return content;
    return content.replace(/\{(\w+)\}/g, (_, token) => {
        const tooltip = annotations[token];
        if (tooltip) return renderAnnotation(token, tooltip);
        return token;
    });
}

function renderPubAuthors(authors) {
    return authors.map((a, i) => {
        let name = a.name;
        if (a.marker) name += `<sup>${a.marker}</sup>`;
        if (a.me) name = `<span class="me">${name}</span>`;
        return name + (i < authors.length - 1 ? ',\n                    ' : '');
    }).join('');
}

function renderPubLinks(links, repo_id) {
    const parts = [];
    const entries = Object.entries(links);
    entries.forEach(([label, url], i) => {
        parts.push(`<a href="${url}">${label}</a>`);
        if (i < entries.length - 1) parts.push('\n                /\n                ');
    });
    if (repo_id) {
        const codeUrl = links['code'] || `https://github.com/${repo_id}`;
        parts.push(`\n                <a href="${codeUrl}">\n                    <img src="https://img.shields.io/github/stars/${repo_id}?style=social" style="vertical-align:middle">\n                </a>`);
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
    /
    <a href="#cool"> Cool </a>
</iro-notice>`;
}

function renderProfile(profile) {
    const nameAnnotations = profile.name.map(
        n => n.annotation ? renderAnnotation(n.text, n.annotation) : n.text
    ).join('\n                    ');

    const linksHtml = profile.links.map(l => `<a href="${l.url}"> ${l.name} </a>`).join('\n                    ・\n                    ');

    const bioHtml = profile.bio.map(p => `\n            <p>\n                ${p}\n            </p>`).join('');

    return `<iro-section>
    <a id="top"></a>

    <div style="display: flex; align-items: center;">
        <!-- Left Part: Description -->
        <div style="flex: 7;">
            <center>
                <font style="font-family: Times, serif;">
                <h2 style="margin-top: 5px; margin-bottom: 0px;">
                    ${nameAnnotations}
                    / ${profile.nameCN}
                </h2>
                    ${profile.email.user}<font style="color: var(--iro-text-color-lightest)">@</font><i>${profile.email.domain}</i>
                </font>
            </center>
            <center>
                <iro-notice>
                    ${linksHtml}
                </iro-notice>
            </center>
${bioHtml}
        </div>
        <!-- Right Part: Avatar -->
        <div style="flex: 3; margin-left: 20px;">
            <img src="${profile.avatar}" alt="${profile.name.map(n => n.text).join(' ')}" style="max-width: 100%; height: auto;">
        </div>
    </div>



</iro-section>`;
}

function renderNews(news) {
    const items = news.map(item => {
        let content = renderNewsContent(item.content, item.annotations);
        if (item.bold) content = `<b>${content}</b>`;
        return `        <li>\n            [${item.date}] ${content}\n        </li>`;
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
            ? `<video class="pub-teaser" src="${pub.teaser.src}" muted="true" autoplay="true" loop="True" width="100%"></video>`
            : `<img class="pub-teaser" src="${pub.teaser.src}" width="100%">`;

        const emphasisLine = pub.emphasis
            ? `\n                <span class="pub-emph">${pub.emphasis}</span>`
            : '';

        return `        <tr class="pub-one">
            <!-- Teaser -->
            <td class="pub-teaser-wrapper"><center>
                ${teaserTag}
            </center></td>
            <!-- Description -->
            <td class="pub-desc-wrapper">
                <span class="pub-title">${pub.title}</span>
                <br>
                <span class="pub-authors">
                    ${renderPubAuthors(pub.authors)}
                </span>
                <br>
                <i>${pub.venue}</i>, ${pub.year} &nbsp;${emphasisLine}
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
        <b>Conference Reviewers</b>: ${exp.services}.
    </p>
</iro-section>`;
}

function renderProjects(projects) {
    const items = projects.map(p =>
        `        <li>\n            [ <b><a href="${p.url}" target="_blank">${p.name}</a></b> ]\n            ${p.description}\n        </li>`
    ).join('\n');

    return `<iro-section>
    <iro-section-head id="cool"> Cool Stuff </iro-section-head>

    <p>
${items}
    </p>

</iro-section>`;
}

function renderFooter(footer) {
    return `<iro-notice> Last Update: ${footer.lastUpdate} </iro-notice>
<iro-notice> Designed by <a href="https://scholar.isshikih.top/">Yan XIA</a> @ <a href="https://github.com/IsshikiHugh/scholar">IsshikiHugh/scholar</a> </iro-notice>`;
}

function renderHome(data) {
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
        renderProjects(data.projects),
        '',
        renderFooter(data.footer),
    ].join('\n');
}
