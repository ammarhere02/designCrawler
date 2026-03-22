#!/usr/bin/env node
/**
 * auth-crawler.js — Authenticated Design Crawler
 * Logs into a website first, then crawls all authenticated pages.
 *
 * Usage:
 *   node auth-crawler.js \
 *     --url https://testserver.maonlinece.com \
 *     --login-url https://testserver.maonlinece.com/signin \
 *     --email anna_ma@realtywarp.com \
 *     --password 123456 \
 *     --output ./output-auth \
 *     --max-pages 30 \
 *     --extra-pages /slides,/history,/profile,/about,/faq,/contact_us
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { program } = require('commander');

// Import generators
const designTokensGen = require('./generators/design-tokens');
const componentInventoryGen = require('./generators/component-inventory');
const pageMapGen = require('./generators/page-map');
const interactionSpecGen = require('./generators/interaction-spec');
const replicationPromptGen = require('./generators/replication-prompt');
const coverageVerificationGen = require('./generators/coverage-verification');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

function isInternalPage(base, href) {
  try {
    const baseUrl = new URL(base);
    const targetUrl = new URL(href, base);
    if (targetUrl.origin !== baseUrl.origin) return false;
    const skip = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp',
      '.ico', '.mp4', '.mp3', '.pdf', '.zip', '.woff', '.woff2',
      '.ttf', '.eot', '.css', '.js', '.json', '.xml', '.txt'];
    const ext = path.extname(targetUrl.pathname).toLowerCase();
    if (skip.includes(ext)) return false;
    // Skip logout
    if (/logout/i.test(targetUrl.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * In-browser extraction function — same as crawler.js but with enhancements
 */
async function extractPageDesign(page, url) {
  return await page.evaluate((pageUrl) => {
    const unique = (arr) => [...new Set(arr.filter(Boolean))];
    const colorSet = new Set();
    const addColor = (c) => {
      if (!c || c === 'transparent' || c === 'rgba(0, 0, 0, 0)' || c === 'none') return;
      colorSet.add(c);
    };
    const typographyMap = {};
    const spacingSet = new Set();
    const radiusSet = new Set();
    const shadowSet = new Set();
    const transitionSet = new Set();
    const components = [];
    const gradientSet = new Set();
    const zIndexSet = new Set();

    const allEls = document.querySelectorAll('*');
    allEls.forEach((el) => {
      const cs = window.getComputedStyle(el);
      addColor(cs.color);
      addColor(cs.backgroundColor);
      addColor(cs.borderColor);
      addColor(cs.borderTopColor);
      addColor(cs.borderBottomColor);
      addColor(cs.borderLeftColor);
      addColor(cs.borderRightColor);
      addColor(cs.outlineColor);

      // Gradients
      const bg = cs.backgroundImage;
      if (bg && bg !== 'none' && /gradient/.test(bg)) gradientSet.add(bg);

      // Z-index
      const z = cs.zIndex;
      if (z && z !== 'auto') zIndexSet.add(z);

      const tag = el.tagName.toLowerCase();
      const fontSize = cs.fontSize;
      const fontFamily = cs.fontFamily;
      const fontWeight = cs.fontWeight;
      const lineHeight = cs.lineHeight;
      const letterSpacing = cs.letterSpacing;
      const textTransform = cs.textTransform;

      if (fontFamily && fontSize) {
        const key = `${tag}|${fontFamily}|${fontSize}|${fontWeight}`;
        if (!typographyMap[key]) {
          typographyMap[key] = { tag, fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, textTransform };
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

    // Breakpoints
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

    // Hover/Focus/Active
    const interactionStates = [];
    try {
      Array.from(document.styleSheets).forEach((sheet) => {
        try {
          Array.from(sheet.cssRules || []).forEach((rule) => {
            if (rule.selectorText) {
              const sel = rule.selectorText;
              if (/:hover|:focus|:active|:checked|:disabled|:visited|:invalid|:valid/.test(sel)) {
                const props = rule.style ? rule.style.cssText : '';
                if (props) interactionStates.push({ selector: sel, styles: props });
              }
            }
            if (rule.type === CSSRule.KEYFRAMES_RULE) {
              interactionStates.push({ type: 'keyframe', name: rule.name });
            }
          });
        } catch {}
      });
    } catch {}

    // Sections
    const sections = [];
    const sectionEls = document.querySelectorAll('section, article, main > *, header, footer, nav, aside, [class*="section"], [class*="hero"], [class*="banner"], [class*="block"], [class*="container"], [class*="dashboard"], [class*="account"], [class*="profile"], [class*="history"], [class*="course"], [class*="card"], [class*="sidebar"], [class*="content"]');
    const seenSections = new Set();
    sectionEls.forEach((sec, i) => {
      const tag = sec.tagName.toLowerCase();
      const classes = [...sec.classList].join(' ');
      const key = `${tag}|${classes}`;
      if (seenSections.has(key)) return;
      seenSections.add(key);
      const role = sec.getAttribute('role') || '';
      const heading = sec.querySelector('h1,h2,h3,h4') ? sec.querySelector('h1,h2,h3,h4').textContent.trim().slice(0, 80) : '';
      const cs = window.getComputedStyle(sec);
      sections.push({
        order: sections.length + 1,
        tag, classes: classes.slice(0, 200), role, heading,
        display: cs.display,
        position: cs.position,
        width: cs.width,
        backgroundColor: cs.backgroundColor
      });
    });

    // Component detection
    const detectComponent = (selector, type) => {
      const els = document.querySelectorAll(selector);
      els.forEach((el) => {
        const cs = window.getComputedStyle(el);
        components.push({
          type, tag: el.tagName.toLowerCase(),
          classes: [...el.classList].join(' ').slice(0, 200),
          id: (el.id || '').slice(0, 50),
          display: cs.display,
          flexDirection: cs.flexDirection,
          gridTemplateColumns: cs.gridTemplateColumns,
          width: cs.width, height: cs.height,
          backgroundColor: cs.backgroundColor,
          borderRadius: cs.borderRadius,
          boxShadow: cs.boxShadow,
          text: (el.textContent || '').trim().slice(0, 100),
          childCount: el.children.length,
        });
      });
    };

    detectComponent('nav, [role="navigation"], [class*="nav"], [class*="menu"], [class*="navbar"]', 'navbar');
    detectComponent('[class*="hero"], [class*="banner"], [class*="jumbotron"]', 'hero');
    detectComponent('[class*="card"], [class*="tile"]', 'card');
    detectComponent('[class*="course"], [class*="topic"]', 'course-card');
    detectComponent('[class*="progress"], [class*="progress-bar"]', 'progress-bar');
    detectComponent('form, [class*="form"]', 'form');
    detectComponent('footer, [role="contentinfo"], [class*="footer"]', 'footer');
    detectComponent('[class*="modal"], [class*="dialog"], [role="dialog"]', 'modal');
    detectComponent('[class*="button"], button, [role="button"], a.btn, [class*="btn"]', 'button');
    detectComponent('input, select, textarea', 'input');
    detectComponent('[class*="tab"], [role="tab"], [role="tablist"]', 'tabs');
    detectComponent('[class*="accordion"], [class*="collapse"], details, [class*="faq"]', 'accordion');
    detectComponent('[class*="sidebar"], aside, [class*="side-panel"]', 'sidebar');
    detectComponent('[class*="video"], video, iframe[src*="youtube"], iframe[src*="vimeo"]', 'video');
    detectComponent('[class*="alert"], [class*="toast"], [class*="notification"], [class*="message"]', 'alert');
    detectComponent('[class*="badge"], [class*="tag"], [class*="label"], [class*="chip"]', 'badge');
    detectComponent('[class*="avatar"], [class*="profile-pic"], [class*="user-icon"]', 'avatar');
    detectComponent('[class*="invoice"], [class*="payment"], [class*="price"]', 'invoice');
    detectComponent('[class*="certificate"], [class*="download"]', 'certificate');
    detectComponent('[class*="history"], [class*="timeline"], [class*="past"]', 'history');
    detectComponent('table, [class*="table"]', 'table');
    detectComponent('[class*="stat"], [class*="metric"], [class*="counter"]', 'stat-card');
    detectComponent('a[href]', 'link');

    // Meta
    const title = document.title;
    const meta = {};
    document.querySelectorAll('meta').forEach((m) => {
      const name = m.getAttribute('name') || m.getAttribute('property');
      const content = m.getAttribute('content');
      if (name && content) meta[name] = content;
    });

    // Links
    const links = unique(Array.from(document.querySelectorAll('a[href]')).map((a) => a.href).filter(Boolean));

    return {
      url: pageUrl, title, meta, links, sections, components,
      designTokens: {
        colors: [...colorSet],
        typography: Object.values(typographyMap),
        spacing: [...spacingSet],
        borderRadius: [...radiusSet],
        boxShadow: [...shadowSet],
        transitions: [...transitionSet],
        breakpoints: unique(breakpoints),
        gradients: [...gradientSet],
        zIndex: [...zIndexSet],
      },
      interactionStates,
    };
  }, url);
}

/**
 * Authenticate and crawl
 */
async function authCrawl(options) {
  const {
    siteUrl, loginUrl, email, password,
    maxPages = 30, outputPath = './output',
    extraPages = [],
    emailSelector = 'input[type="email"], input[name="email"], input[name="username"], #email, #username',
    passwordSelector = 'input[type="password"], input[name="password"], #password',
    submitSelector = 'button[type="submit"], input[type="submit"], .btn-login, .btn-signin, [class*="login-btn"], [class*="signin"], button:has-text("Sign In"), button:has-text("Login")',
  } = options;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });

  const loginPage = await context.newPage();

  // ── STEP 1: LOGIN ──
  console.log(`\n🔐 Logging in at: ${loginUrl}`);
  await loginPage.goto(loginUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);

  // Fill email
  try {
    const emailInput = await loginPage.$(emailSelector);
    if (emailInput) {
      await emailInput.fill(email);
      console.log(`   ✅ Filled email: ${email}`);
    } else {
      await loginPage.fill('input[type="text"]', email);
      console.log(`   ✅ Filled email (text input): ${email}`);
    }
  } catch (err) {
    console.error(`   ❌ Failed to fill email: ${err.message}`);
  }

  // Fill password
  try {
    await loginPage.fill(passwordSelector, password);
    console.log('   ✅ Filled password');
  } catch (err) {
    console.error(`   ❌ Failed to fill password: ${err.message}`);
  }

  // Submit and WAIT for full redirect chain to complete
  try {
    const submitBtn = await loginPage.$('button[type="submit"], input[type="submit"]');
    if (submitBtn) {
      await Promise.all([
        loginPage.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
        submitBtn.click(),
      ]);
    } else {
      await Promise.all([
        loginPage.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
        loginPage.press(passwordSelector, 'Enter'),
      ]);
    }
    console.log('   ✅ Submitted login form');
  } catch (err) {
    console.error(`   ❌ Failed to submit: ${err.message}`);
  }

  // Wait for any additional redirects (e.g., /check_login -> /slides)
  await sleep(5000);
  try {
    await loginPage.waitForLoadState('networkidle', { timeout: 10000 });
  } catch {}

  let currentUrl = loginPage.url();
  console.log(`   📍 Post-login URL: ${currentUrl}`);

  // Verify session: try navigating to an authenticated page
  const testAuthUrl = extraPages.length > 0
    ? `${new URL(siteUrl).origin}${extraPages[0]}`
    : currentUrl;
  
  if (testAuthUrl !== currentUrl) {
    console.log(`   🔍 Verifying session with: ${testAuthUrl}`);
    await loginPage.goto(testAuthUrl, { waitUntil: 'networkidle', timeout: 15000 });
    await sleep(2000);
    const verifyUrl = loginPage.url();
    if (/signin|login/i.test(verifyUrl)) {
      console.warn('   ⚠️  Session verification failed — still redirected to login');
      console.warn('   Attempting login again...');
      // The login was likely a redirect that didn't set cookies. Retry.
      await loginPage.goto(loginUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await sleep(2000);
      try { await loginPage.fill(emailSelector, email); } catch { await loginPage.fill('input[type="text"]', email); }
      await loginPage.fill(passwordSelector, password);
      const btn = await loginPage.$('button[type="submit"], input[type="submit"]');
      if (btn) await btn.click(); else await loginPage.press(passwordSelector, 'Enter');
      await sleep(5000);
      try { await loginPage.waitForLoadState('networkidle', { timeout: 10000 }); } catch {}
      console.log(`   📍 Retry post-login URL: ${loginPage.url()}`);
    } else {
      console.log(`   ✅ Session verified — authenticated page loaded: ${verifyUrl}`);
    }
  }

  // Print cookies to verify session
  const cookies = await context.cookies();
  const sessionCookies = cookies.filter(c => /sess|ci_|token|auth|login/i.test(c.name));
  console.log(`   🍪 Session cookies: ${sessionCookies.map(c => c.name).join(', ') || 'none detected'}`);

  await loginPage.close();

  // ── STEP 2: BFS CRAWL (authenticated) ──
  const visited = new Set();
  const baseUrl = new URL(siteUrl).origin;

  // Build initial queue — prioritize extra pages (known authenticated routes) first
  const queue = [];
  // Add extra pages first — these are the most important authenticated pages
  extraPages.forEach((p) => {
    const full = p.startsWith('http') ? p : `${baseUrl}${p}`;
    queue.push(normalizeUrl(full));
  });
  // Then add the post-login landing page
  queue.push(normalizeUrl(currentUrl));

  const results = [];

  console.log(`\n🕷️  Starting authenticated crawl: ${baseUrl}`);
  console.log(`   Max pages: ${maxPages}`);
  console.log(`   Extra page seeds: ${extraPages.join(', ') || 'none'}\n`);

  while (queue.length > 0 && results.length < maxPages) {
    const url = queue.shift();
    const normUrl = normalizeUrl(url);

    if (visited.has(normUrl)) continue;
    // Skip logout and check_login
    if (/logout|check_login/i.test(normUrl)) continue;
    visited.add(normUrl);

    const page = await context.newPage();
    try {
      console.log(`  [${results.length + 1}/${maxPages}] Crawling: ${normUrl}`);
      await page.goto(normUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await sleep(2000);

      // Check if redirected to login (session expired)
      const curUrl = page.url();
      if (/signin|login/i.test(curUrl) && !/signin|login/i.test(normUrl)) {
        console.warn(`   ⚠️  Redirected to login for ${normUrl} — skipping`);
        await page.close();
        continue;
      }

      const data = await extractPageDesign(page, curUrl);
      // Store with the intended URL, not the redirected one
      data.intendedUrl = normUrl;
      results.push(data);

      // Queue new internal links
      for (const link of data.links) {
        const norm = normalizeUrl(link);
        if (!visited.has(norm) && isInternalPage(siteUrl, link) && !/logout|check_login/i.test(norm)) {
          queue.push(norm);
        }
      }
    } catch (err) {
      console.warn(`   ⚠️  Failed to crawl ${normUrl}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();

  // Persist raw JSON
  if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath, { recursive: true });
  const rawPath = path.join(outputPath, 'raw-data.json');
  fs.writeFileSync(rawPath, JSON.stringify(results, null, 2));
  console.log(`\n✅  Authenticated crawl complete. ${results.length} pages extracted.`);
  console.log(`   Raw data saved to: ${rawPath}\n`);

  return results;
}

// ── CLI ──
program
  .name('auth-crawler')
  .description('Authenticated design extraction crawler')
  .version('1.0.0')
  .requiredOption('-u, --url <url>', 'Site base URL')
  .requiredOption('-l, --login-url <url>', 'Login page URL')
  .requiredOption('-e, --email <email>', 'Login email')
  .requiredOption('-p, --password <password>', 'Login password')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-m, --max-pages <number>', 'Max pages to crawl', '30')
  .option('--extra-pages <pages>', 'Comma-separated additional page paths to seed', '')
  .parse(process.argv);

const opts = program.opts();
const outputDir = path.resolve(opts.output);
const maxPages = parseInt(opts.maxPages, 10) || 30;
const extraPages = opts.extraPages ? opts.extraPages.split(',').map(s => s.trim()).filter(Boolean) : [];

async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║      🔐 Authenticated Design Crawler v1.0.0      ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // Phase 1: Authenticated crawl
  console.log('📡 Phase 1: Authenticated Crawl\n');
  const pages = await authCrawl({
    siteUrl: opts.url,
    loginUrl: opts.loginUrl,
    email: opts.email,
    password: opts.password,
    maxPages, outputPath: outputDir,
    extraPages,
  });

  if (!pages || pages.length === 0) {
    console.error('\n❌ No pages extracted. Check credentials and URLs.');
    process.exit(1);
  }

  // Phase 2: Generate markdown files
  console.log('📝 Phase 2: Generating markdown files...\n');
  try {
    designTokensGen.generate(pages, outputDir);
    componentInventoryGen.generate(pages, outputDir);
    pageMapGen.generate(pages, outputDir);
    interactionSpecGen.generate(pages, outputDir);
    replicationPromptGen.generate(pages, outputDir);
    coverageVerificationGen.generate(pages, outputDir);
  } catch (err) {
    console.error(`\n❌ Generation failed: ${err.message}`);
    process.exit(1);
  }

  // Summary
  const files = ['design-tokens.md','component-inventory.md','page-map.md','interaction-spec.md','replication-prompt.md','coverage-verification.md','raw-data.json'];
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║      ✅ Authenticated Design Package Complete     ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
  console.log(`  Pages crawled : ${pages.length}`);
  console.log(`  Output dir    : ${outputDir}\n`);
  console.log('  Generated files:');
  files.forEach((file) => {
    const fp = path.join(outputDir, file);
    if (fs.existsSync(fp)) {
      const size = (fs.statSync(fp).size / 1024).toFixed(1);
      console.log(`    ✅ ${file.padEnd(28)} (${size} KB)`);
    }
  });
  console.log('');
}

main();
