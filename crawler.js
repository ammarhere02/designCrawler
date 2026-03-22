/**
 * crawler.js
 * Core Playwright crawler — BFS-traverses a website and extracts
 * all design data: tokens, components, interactions, and page structure.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

/**
 * Sleep helper
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Normalize a URL to a canonical form (no trailing slash, no hash)
 */
function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    let href = u.href;
    if (href.endsWith('/') && u.pathname !== '/') href = href.slice(0, -1);
    return href;
  } catch {
    return url;
  }
}

/**
 * Check if a URL is an internal page link (same origin, not an asset)
 */
function isInternalPage(base, href) {
  try {
    const baseUrl = new URL(base);
    const targetUrl = new URL(href, base);
    if (targetUrl.origin !== baseUrl.origin) return false;
    // Skip common asset/non-page paths
    const skip = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp',
      '.ico', '.mp4', '.mp3', '.pdf', '.zip', '.woff', '.woff2',
      '.ttf', '.eot', '.css', '.js', '.json', '.xml', '.txt'];
    const ext = path.extname(targetUrl.pathname).toLowerCase();
    if (skip.includes(ext)) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * In-browser extraction function — runs inside Playwright's page context.
 * Returns a rich design data object for the current page.
 */
async function extractPageDesign(page, url) {
  return await page.evaluate((pageUrl) => {
    /* ─── HELPERS ─── */
    const unique = (arr) => [...new Set(arr.filter(Boolean))];
    const px = (v) => (v && v !== 'none' && v !== 'normal' && v !== '0px' ? v : null);

    /* ─── COLORS ─── */
    const colorSet = new Set();
    const addColor = (c) => {
      if (!c || c === 'transparent' || c === 'rgba(0, 0, 0, 0)' || c === 'none') return;
      colorSet.add(c);
    };

    /* ─── TYPOGRAPHY ─── */
    const typographyMap = {};

    /* ─── SPACING ─── */
    const spacingSet = new Set();

    /* ─── RADIUS & SHADOW ─── */
    const radiusSet = new Set();
    const shadowSet = new Set();

    /* ─── TRANSITIONS ─── */
    const transitionSet = new Set();

    /* ─── COMPONENTS ─── */
    const components = [];

    // Walk all elements and collect design tokens
    const allEls = document.querySelectorAll('*');
    allEls.forEach((el) => {
      const cs = window.getComputedStyle(el);
      addColor(cs.color);
      addColor(cs.backgroundColor);
      addColor(cs.borderColor);
      addColor(cs.outlineColor);

      const tag = el.tagName.toLowerCase();
      const fontSize = cs.fontSize;
      const fontFamily = cs.fontFamily;
      const fontWeight = cs.fontWeight;
      const lineHeight = cs.lineHeight;
      const letterSpacing = cs.letterSpacing;

      if (fontFamily && fontSize) {
        const key = `${tag}|${fontFamily}|${fontSize}|${fontWeight}`;
        if (!typographyMap[key]) {
          typographyMap[key] = { tag, fontFamily, fontSize, fontWeight, lineHeight, letterSpacing };
        }
      }

      ['marginTop','marginBottom','marginLeft','marginRight',
       'paddingTop','paddingBottom','paddingLeft','paddingRight',
       'gap','rowGap','columnGap'].forEach((prop) => {
        const v = cs[prop];
        if (v && v !== '0px') spacingSet.add(v);
      });

      const br = cs.borderRadius;
      if (br && br !== '0px') radiusSet.add(br);

      const bs = cs.boxShadow;
      if (bs && bs !== 'none') shadowSet.add(bs);

      const tr = cs.transition;
      if (tr && tr !== 'all 0s ease 0s' && tr !== 'none 0s ease 0s 0s') transitionSet.add(tr);
    });

    /* ─── BREAKPOINTS from stylesheets ─── */
    const breakpoints = [];
    try {
      Array.from(document.styleSheets).forEach((sheet) => {
        try {
          Array.from(sheet.cssRules || []).forEach((rule) => {
            if (rule.type === CSSRule.MEDIA_RULE) {
              breakpoints.push(rule.conditionText || rule.media.mediaText);
            }
          });
        } catch {}
      });
    } catch {}

    /* ─── HOVER/FOCUS/ACTIVE STATES from stylesheets ─── */
    const interactionStates = [];
    try {
      Array.from(document.styleSheets).forEach((sheet) => {
        try {
          Array.from(sheet.cssRules || []).forEach((rule) => {
            if (rule.selectorText) {
              const sel = rule.selectorText;
              if (/:hover|:focus|:active|:checked|:disabled|:visited/.test(sel)) {
                const props = rule.style ? rule.style.cssText : '';
                if (props) interactionStates.push({ selector: sel, styles: props });
              }
            }
            // Keyframes
            if (rule.type === CSSRule.KEYFRAMES_RULE) {
              interactionStates.push({ type: 'keyframe', name: rule.name });
            }
          });
        } catch {}
      });
    } catch {}

    /* ─── PAGE STRUCTURE ─── */
    const getTextContent = (el) => el ? el.textContent.trim().slice(0, 120) : '';

    const sections = [];
    const sectionEls = document.querySelectorAll('section, article, main > *, header, footer, nav, aside, [class*="section"], [class*="hero"], [class*="banner"], [class*="block"]');
    sectionEls.forEach((sec, i) => {
      const tag = sec.tagName.toLowerCase();
      const classes = [...sec.classList].join(' ');
      const role = sec.getAttribute('role') || '';
      const heading = sec.querySelector('h1,h2,h3') ? sec.querySelector('h1,h2,h3').textContent.trim().slice(0, 80) : '';
      sections.push({ order: i + 1, tag, classes: classes.slice(0, 200), role, heading });
    });

    /* ─── COMPONENT DETECTION ─── */
    const detectComponent = (selector, type) => {
      const els = document.querySelectorAll(selector);
      els.forEach((el) => {
        const cs = window.getComputedStyle(el);
        components.push({
          type,
          tag: el.tagName.toLowerCase(),
          classes: [...el.classList].join(' ').slice(0, 200),
          display: cs.display,
          flexDirection: cs.flexDirection,
          gridTemplateColumns: cs.gridTemplateColumns,
          width: cs.width,
          height: cs.height,
          text: getTextContent(el).slice(0, 100),
          childCount: el.children.length,
        });
      });
    };

    detectComponent('nav, [role="navigation"], [class*="nav"], [class*="menu"]', 'navbar');
    detectComponent('[class*="hero"], [class*="banner"], [class*="jumbotron"]', 'hero');
    detectComponent('[class*="card"], [class*="tile"], [class*="item"]', 'card');
    detectComponent('form, [class*="form"]', 'form');
    detectComponent('footer, [role="contentinfo"]', 'footer');
    detectComponent('[class*="modal"], [class*="dialog"], [role="dialog"]', 'modal');
    detectComponent('[class*="button"], button, [role="button"], a.btn', 'button');
    detectComponent('input, select, textarea', 'input');
    detectComponent('[class*="tab"], [role="tab"], [role="tablist"]', 'tabs');
    detectComponent('[class*="accordion"], [class*="collapse"], details', 'accordion');
    detectComponent('a[href]', 'link');

    /* ─── META ─── */
    const title = document.title;
    const meta = {};
    document.querySelectorAll('meta').forEach((m) => {
      const name = m.getAttribute('name') || m.getAttribute('property');
      const content = m.getAttribute('content');
      if (name && content) meta[name] = content;
    });

    /* ─── LINKS (for BFS) ─── */
    const links = unique(
      Array.from(document.querySelectorAll('a[href]'))
        .map((a) => a.href)
        .filter(Boolean)
    );

    return {
      url: pageUrl,
      title,
      meta,
      links,
      sections,
      components,
      designTokens: {
        colors: [...colorSet],
        typography: Object.values(typographyMap),
        spacing: [...spacingSet],
        borderRadius: [...radiusSet],
        boxShadow: [...shadowSet],
        transitions: [...transitionSet],
        breakpoints: unique(breakpoints),
      },
      interactionStates,
    };
  }, url);
}

/**
 * Main crawl function
 * @param {string} startUrl - The root URL to start crawling
 * @param {object} options - { maxPages, outputPath }
 * @returns {object[]} Array of per-page design data
 */
async function crawl(startUrl, options = {}) {
  const { maxPages = 30, outputPath = './output' } = options;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });

  const visited = new Set();
  const queue = [normalizeUrl(startUrl)];
  const results = [];

  console.log(`\n🕷️  Starting crawl: ${startUrl}`);
  console.log(`   Max pages: ${maxPages}\n`);

  while (queue.length > 0 && results.length < maxPages) {
    const url = queue.shift();
    const normUrl = normalizeUrl(url);

    if (visited.has(normUrl)) continue;
    visited.add(normUrl);

    const page = await context.newPage();
    try {
      console.log(`  [${results.length + 1}/${maxPages}] Crawling: ${normUrl}`);
      await page.goto(normUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(1500); // allow JS to settle

      const data = await extractPageDesign(page, normUrl);
      results.push(data);

      // Queue new internal links
      for (const link of data.links) {
        const norm = normalizeUrl(link);
        if (!visited.has(norm) && isInternalPage(startUrl, link)) {
          queue.push(norm);
        }
      }
    } catch (err) {
      console.warn(`  ⚠️  Failed to crawl ${normUrl}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();

  // Persist raw JSON
  if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath, { recursive: true });
  const rawPath = path.join(outputPath, 'raw-data.json');
  fs.writeFileSync(rawPath, JSON.stringify(results, null, 2));
  console.log(`\n✅  Crawl complete. ${results.length} pages extracted.`);
  console.log(`   Raw data saved to: ${rawPath}\n`);

  return results;
}

module.exports = { crawl };
