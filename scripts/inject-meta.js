#!/usr/bin/env node
/**
 * inject-meta.js — Build-time SEO / social-card injector.
 *
 * Reads contents/data.json, computes the metadata with the shared MetaKit
 * module (js/meta.js — the exact logic the runtime uses), and writes the tags
 * statically into index.html between the
 *
 *     <!-- meta:auto:start --> ... <!-- meta:auto:end -->
 *
 * markers. This is what makes social link-preview crawlers (Twitter/X, Slack,
 * Facebook), which do not execute JavaScript, see the Open Graph tags.
 *
 * Run manually with `node scripts/inject-meta.js`, or automatically in CI
 * (see .github/workflows/deploy.yml). Idempotent: re-running only rewrites the
 * marked block.
 */
const fs = require('fs');
const path = require('path');
const { computeMeta, buildHeadHtml } = require('../js/meta.js');

const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'contents', 'data.json');
const htmlPath = path.join(root, 'index.html');
const cnamePath = path.join(root, 'CNAME');

const START = '<!-- meta:auto:start -->';
const END = '<!-- meta:auto:end -->';

// Base URL for canonical / absolute og:image. Sourced from the existing CNAME
// file so no metadata-only keys are added to data.json; left empty if absent.
function readBaseUrl() {
    try {
        const host = fs.readFileSync(cnamePath, 'utf8').trim();
        return host ? 'https://' + host.replace(/\/+$/, '') : '';
    } catch (e) {
        return '';
    }
}

function main() {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const meta = computeMeta(data, readBaseUrl());
    const block = buildHeadHtml(meta, '        ');

    let html = fs.readFileSync(htmlPath, 'utf8');
    const re = new RegExp(
        START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
        '[\\s\\S]*?' +
        END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    if (!re.test(html)) {
        console.error(`Error: markers ${START} ... ${END} not found in index.html`);
        process.exit(1);
    }

    html = html.replace(re, `${START}\n${block}\n        ${END}`);
    fs.writeFileSync(htmlPath, html);
    console.log('Injected metadata into index.html:');
    console.log(`  title:  ${meta.title}`);
    console.log(`  og:url: ${meta.url}`);
}

main();
