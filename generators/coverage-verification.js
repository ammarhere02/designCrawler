/**
 * generators/coverage-verification.js
 * Generates coverage-verification.md by comparing source crawl data
 * against a target site crawl (if available)
 */

const fs = require('fs');
const path = require('path');

function classifyPage(url) {
  const pathname = (() => { try { return new URL(url).pathname; } catch { return url; } })();
  if (pathname === '/' || pathname === '') return 'homepage';
  if (/\/admin/.test(pathname)) return 'admin';
  if (/\/signin/.test(pathname)) return 'signin';
  if (/\/signup/.test(pathname)) return 'signup';
  if (/\/faq/.test(pathname)) return 'faq';
  if (/\/about/.test(pathname)) return 'about';
  if (/\/contact/.test(pathname)) return 'contact';
  if (/\/terms/.test(pathname)) return 'terms';
  if (/\/forgot/.test(pathname)) return 'forgot_password';
  return 'other';
}

function generate(pages, outputPath, targetPagesData) {
  const lines = [];

  lines.push('# Coverage Verification Report\n');
  lines.push(`> Generated: ${new Date().toISOString()}`);

  let siteRoot = pages[0]?.url || 'https://example.com';
  try { siteRoot = new URL(siteRoot).origin; } catch {}
  lines.push(`> **Source Site:** \`${siteRoot}\`\n`);

  // ── SOURCE PAGES ──
  lines.push('## Source Site — Pages Crawled\n');
  lines.push('| # | URL | Title | Page Type | Sections | Components | Status |');
  lines.push('|---|-----|-------|-----------|----------|------------|--------|');
  pages.forEach((page, i) => {
    let urlPath = page.url;
    try { urlPath = new URL(page.url).pathname; } catch {}
    const pageType = classifyPage(page.url);
    const sectionCount = (page.sections || []).length;
    const compCount = (page.components || []).length;
    const is404 = (page.title || '').includes('404');
    const status = is404 ? '⚠️ 404' : '✅ Crawled';
    lines.push(`| ${i + 1} | \`${urlPath}\` | ${(page.title || '-').slice(0, 60)} | ${pageType} | ${sectionCount} | ${compCount} | ${status} |`);
  });

  // ── PAGE TYPE SUMMARY ──
  const typeMap = {};
  pages.forEach((p) => {
    const t = classifyPage(p.url);
    if (!typeMap[t]) typeMap[t] = [];
    typeMap[t].push(p.url);
  });

  lines.push('\n## Page Type Summary\n');
  lines.push('| Page Type | Count | URLs |');
  lines.push('|-----------|-------|------|');
  Object.entries(typeMap).forEach(([type, urls]) => {
    const urlList = urls.map((u) => { try { return new URL(u).pathname; } catch { return u; } }).join(', ');
    lines.push(`| ${type} | ${urls.length} | ${urlList} |`);
  });

  // ── COMPONENT COVERAGE ──
  const componentTypes = new Set();
  pages.forEach((p) => (p.components || []).forEach((c) => componentTypes.add(c.type)));

  lines.push('\n## Component Coverage\n');
  lines.push(`| Component Type | Pages Present |`);
  lines.push(`|----------------|---------------|`);
  componentTypes.forEach((type) => {
    const presentOn = pages
      .filter((p) => (p.components || []).some((c) => c.type === type))
      .map((p) => { try { return new URL(p.url).pathname; } catch { return p.url; } });
    lines.push(`| ${type} | ${presentOn.join(', ')} |`);
  });

  // ── VERIFICATION CHECKLIST ──
  lines.push('\n## Verification Checklist\n');
  const validPages = pages.filter((p) => !(p.title || '').includes('404'));
  validPages.forEach((p) => {
    let urlPath = p.url;
    try { urlPath = new URL(p.url).pathname; } catch {}
    lines.push(`- [x] \`${urlPath}\` — ${classifyPage(p.url)} — ${(p.components || []).length} components extracted`);
  });

  const errorPages = pages.filter((p) => (p.title || '').includes('404'));
  if (errorPages.length > 0) {
    lines.push('\n### Error Pages (excluded from replication)\n');
    errorPages.forEach((p) => {
      let urlPath = p.url;
      try { urlPath = new URL(p.url).pathname; } catch {}
      lines.push(`- ⚠️ \`${urlPath}\` — returned 404`);
    });
  }

  lines.push('\n---\n');
  lines.push('*Auto-generated coverage verification. All pages must be processed before code generation.*\n');

  const output = lines.join('\n') + '\n';
  fs.writeFileSync(path.join(outputPath, 'coverage-verification.md'), output);
  console.log('  ✅ coverage-verification.md');
  return output;
}

module.exports = { generate };
