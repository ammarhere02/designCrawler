/**
 * generators/page-map.js
 * Generates page-map.md from raw crawl data
 */

const fs = require('fs');
const path = require('path');

// Attempt to detect shared layout elements by finding components present on many pages
function detectSharedElements(pages) {
  if (pages.length < 2) return [];
  const threshold = Math.max(2, Math.floor(pages.length * 0.6));
  const componentCounts = {};

  pages.forEach((page) => {
    const seen = new Set();
    (page.components || []).forEach((comp) => {
      const key = `${comp.type}|${comp.tag}|${(comp.classes || '').slice(0, 40)}`;
      if (!seen.has(key)) {
        seen.add(key);
        componentCounts[key] = (componentCounts[key] || 0) + 1;
      }
    });
  });

  return Object.entries(componentCounts)
    .filter(([, count]) => count >= threshold)
    .map(([key]) => {
      const [type, tag] = key.split('|');
      return { type, tag };
    });
}

function generate(pages, outputPath) {
  const sharedElements = detectSharedElements(pages);
  const lines = [];

  lines.push('# Page Map\n');
  lines.push(`> Crawled ${pages.length} page(s). Generated ${new Date().toISOString()}\n`);

  // ── ROUTE LIST ──
  lines.push('## Route List\n');
  lines.push('| # | Path | Title | Description |');
  lines.push('|---|------|-------|-------------|');
  pages.forEach((page, i) => {
    let urlPath = '-';
    try { urlPath = new URL(page.url).pathname; } catch {}
    const title = (page.title || '-').slice(0, 60);
    const desc = (page.meta?.description || page.meta?.['og:description'] || '-').slice(0, 100);
    lines.push(`| ${i + 1} | \`${urlPath}\` | ${title} | ${desc} |`);
  });

  // ── PER-PAGE SECTION ORDER ──
  lines.push('\n## Per-Page Section Structure\n');
  pages.forEach((page) => {
    let urlPath = page.url;
    try { urlPath = new URL(page.url).pathname || '/'; } catch {}
    lines.push(`\n### \`${urlPath}\`\n`);
    lines.push(`**Title:** ${page.title || 'N/A'}\n`);

    if (page.sections && page.sections.length > 0) {
      lines.push('| Order | Tag | Role | Heading |');
      lines.push('|-------|-----|------|---------|');
      page.sections.slice(0, 20).forEach((sec) => {
        lines.push(`| ${sec.order} | \`${sec.tag}\` | ${sec.role || '-'} | ${sec.heading || '-'} |`);
      });
    } else {
      lines.push('_No explicit sections detected._\n');
    }
  });

  // ── SHARED ELEMENTS ──
  lines.push('\n## Shared Layout Elements\n');
  lines.push(`> Elements detected on ≥60% of all pages\n`);
  if (sharedElements.length > 0) {
    lines.push('| Type | Tag |');
    lines.push('|------|-----|');
    sharedElements.forEach((el) => lines.push(`| ${el.type} | \`${el.tag}\` |`));
  } else {
    lines.push('_Could not detect shared layout elements (possibly single-page site or insufficient crawl depth)._');
  }

  const output = lines.join('\n') + '\n';
  fs.writeFileSync(path.join(outputPath, 'page-map.md'), output);
  console.log('  ✅ page-map.md');
  return output;
}

module.exports = { generate };
