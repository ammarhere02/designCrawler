/**
 * generators/design-tokens.js
 * Generates design-tokens.md from raw crawl data
 */

const fs = require('fs');
const path = require('path');

// Convert rgb(r,g,b) to hex
function rgbToHex(rgb) {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;
  const [, r, g, b] = match.map(Number);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Convert rgb to hsl string
function rgbToHsl(rgb) {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;
  let [r, g, b] = [+match[1] / 255, +match[2] / 255, +match[3] / 255];
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

function deduplicateColors(pages) {
  const colorMap = new Map();
  pages.forEach((page) => {
    (page.designTokens?.colors || []).forEach((c) => {
      const hex = rgbToHex(c) || c;
      if (!colorMap.has(hex)) {
        colorMap.set(hex, { raw: c, hex, hsl: rgbToHsl(c) || '-' });
      }
    });
  });
  return [...colorMap.values()];
}

function deduplicateTypography(pages) {
  const typoMap = new Map();
  pages.forEach((page) => {
    (page.designTokens?.typography || []).forEach((t) => {
      const key = `${t.fontFamily}|${t.fontSize}|${t.fontWeight}`;
      if (!typoMap.has(key)) typoMap.set(key, t);
    });
  });
  // Filter noise: only include meaningful tags
  const meaningfulTags = ['h1','h2','h3','h4','h5','h6','p','a','span','button','label','li','th','td','caption'];
  return [...typoMap.values()].filter((t) => meaningfulTags.includes(t.tag));
}

function deduplicateSpacing(pages) {
  const set = new Set();
  pages.forEach((p) => (p.designTokens?.spacing || []).forEach((s) => set.add(s)));
  return [...set].sort((a, b) => parseFloat(a) - parseFloat(b));
}

function deduplicateRadius(pages) {
  const set = new Set();
  pages.forEach((p) => (p.designTokens?.borderRadius || []).forEach((r) => set.add(r)));
  return [...set];
}

function deduplicateShadows(pages) {
  const set = new Set();
  pages.forEach((p) => (p.designTokens?.boxShadow || []).forEach((s) => set.add(s)));
  return [...set];
}

function deduplicateBreakpoints(pages) {
  const set = new Set();
  pages.forEach((p) => (p.designTokens?.breakpoints || []).forEach((b) => set.add(b)));
  return [...set];
}

function generate(pages, outputPath) {
  const colors = deduplicateColors(pages);
  const typography = deduplicateTypography(pages);
  const spacing = deduplicateSpacing(pages);
  const radii = deduplicateRadius(pages);
  const shadows = deduplicateShadows(pages);
  const breakpoints = deduplicateBreakpoints(pages);

  const lines = [];

  lines.push('# Design Tokens\n');
  lines.push(`> Extracted from ${pages.length} page(s). Generated ${new Date().toISOString()}\n`);

  // ── COLORS ──
  lines.push('## Color Palette\n');
  lines.push('| # | Hex | HSL | Raw Value |');
  lines.push('|---|-----|-----|-----------|');
  colors.slice(0, 80).forEach((c, i) => {
    lines.push(`| ${i + 1} | \`${c.hex}\` | ${c.hsl} | ${c.raw} |`);
  });

  // ── TYPOGRAPHY ──
  lines.push('\n## Typography Scale\n');
  lines.push('| Element | Font Family | Size | Weight | Line Height | Letter Spacing |');
  lines.push('|---------|-------------|------|--------|-------------|----------------|');
  typography.forEach((t) => {
    const ff = t.fontFamily?.split(',')[0].replace(/['"]/g, '').trim();
    lines.push(`| \`${t.tag}\` | ${ff} | ${t.fontSize} | ${t.fontWeight} | ${t.lineHeight} | ${t.letterSpacing} |`);
  });

  // ── SPACING ──
  lines.push('\n## Spacing Scale\n');
  lines.push('| Value |');
  lines.push('|-------|');
  spacing.forEach((s) => lines.push(`| \`${s}\` |`));

  // ── BORDER RADIUS ──
  lines.push('\n## Border Radius\n');
  lines.push('| Value |');
  lines.push('|-------|');
  radii.forEach((r) => lines.push(`| \`${r}\` |`));

  // ── BOX SHADOW ──
  lines.push('\n## Box Shadows\n');
  lines.push('| Value |');
  lines.push('|-------|');
  shadows.slice(0, 20).forEach((s) => lines.push(`| \`${s}\` |`));

  // ── BREAKPOINTS ──
  lines.push('\n## Responsive Breakpoints\n');
  lines.push('| Media Query |');
  lines.push('|-------------|');
  breakpoints.forEach((b) => lines.push(`| \`${b}\` |`));

  const output = lines.join('\n') + '\n';
  fs.writeFileSync(path.join(outputPath, 'design-tokens.md'), output);
  console.log('  ✅ design-tokens.md');
  return output;
}

module.exports = { generate };
