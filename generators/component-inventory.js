/**
 * generators/component-inventory.js
 * Generates component-inventory.md from raw crawl data
 */

const fs = require('fs');
const path = require('path');

const COMPONENT_TYPES = ['navbar','hero','card','form','footer','modal','button','input','tabs','accordion','link'];

function groupComponents(pages) {
  const grouped = {};
  COMPONENT_TYPES.forEach((t) => (grouped[t] = []));

  pages.forEach((page) => {
    (page.components || []).forEach((comp) => {
      if (!grouped[comp.type]) grouped[comp.type] = [];
      grouped[comp.type].push({ ...comp, sourcePage: page.url });
    });
  });

  // Deduplicate by class signature
  Object.keys(grouped).forEach((type) => {
    const seen = new Set();
    grouped[type] = grouped[type].filter((c) => {
      const key = `${c.tag}|${c.classes?.trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

  return grouped;
}

function generate(pages, outputPath) {
  const grouped = groupComponents(pages);
  const lines = [];

  lines.push('# Component Inventory\n');
  lines.push(`> Extracted from ${pages.length} page(s). Generated ${new Date().toISOString()}\n`);
  lines.push('This inventory logs all detected UI components, their HTML structure, layout properties, and responsive behavior.\n');

  COMPONENT_TYPES.forEach((type) => {
    const items = grouped[type];
    if (!items || items.length === 0) return;

    lines.push(`\n## ${type.charAt(0).toUpperCase() + type.slice(1)} (${items.length} unique variants)\n`);
    lines.push('| Tag | Classes | Display | Flex Dir | Grid Cols | Width | Height | Children | Source Page |');
    lines.push('|-----|---------|---------|----------|-----------|-------|--------|----------|-------------|');

    items.slice(0, 25).forEach((c) => {
      const classes = (c.classes || '-').slice(0, 60);
      const grid = (c.gridTemplateColumns && c.gridTemplateColumns !== 'none') ? c.gridTemplateColumns.slice(0, 40) : '-';
      const flex = (c.flexDirection && c.flexDirection !== 'row') ? c.flexDirection : '-';
      const src = c.sourcePage ? new URL(c.sourcePage).pathname : '-';
      lines.push(`| \`${c.tag}\` | ${classes} | ${c.display || '-'} | ${flex} | ${grid} | ${c.width || '-'} | ${c.height || '-'} | ${c.childCount ?? '-'} | ${src} |`);
    });

    // Layout notes
    const flexComponents = items.filter((c) => c.display === 'flex');
    const gridComponents = items.filter((c) => c.display === 'grid');
    if (flexComponents.length > 0 || gridComponents.length > 0) {
      lines.push(`\n**Layout Notes:**`);
      if (flexComponents.length > 0) lines.push(`- ${flexComponents.length} variant(s) use **Flexbox** layout`);
      if (gridComponents.length > 0) lines.push(`- ${gridComponents.length} variant(s) use **CSS Grid** layout`);
    }
  });

  const output = lines.join('\n') + '\n';
  fs.writeFileSync(path.join(outputPath, 'component-inventory.md'), output);
  console.log('  ✅ component-inventory.md');
  return output;
}

module.exports = { generate };
