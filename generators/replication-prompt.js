/**
 * generators/replication-prompt.js
 * Generates the master replication-prompt.md — the LLM instruction package
 */

const fs = require('fs');
const path = require('path');

function generate(pages, outputPath) {
  const siteUrl = pages[0]?.url || 'https://example.com';
  let siteRoot = siteUrl;
  try { siteRoot = new URL(siteUrl).origin; } catch {}

  const pageList = pages.map((p) => {
    let urlPath = p.url;
    try { urlPath = new URL(p.url).pathname || '/'; } catch {}
    return `- \`${urlPath}\` — ${p.title || 'Untitled'}`;
  }).join('\n');

  const totalComponents = pages.reduce((acc, p) => acc + (p.components?.length || 0), 0);
  const totalInteractions = pages.reduce((acc, p) => acc + (p.interactionStates?.length || 0), 0);

  const prompt = `# Replication Prompt
> Master LLM Prompt Template — Generated ${new Date().toISOString()}
> Source site: ${siteRoot}

---

## Overview

This is the **master engineering prompt** for replicating the UI/UX design of \`${siteRoot}\` onto a target website. All design decisions have been pre-extracted and documented in the four supplementary files included in this package. You must cross-reference them during implementation.

**Package files:**
| File | Purpose |
|------|---------|
| \`design-tokens.md\` | All colors, fonts, spacing, radii, shadows, and breakpoints |
| \`component-inventory.md\` | HTML structure and layout for all UI components |
| \`page-map.md\` | Full route list and per-page section ordering |
| \`interaction-spec.md\` | Hover, focus, active, animation, and scroll behaviors |

**Site stats extracted:**
- ${pages.length} pages crawled
- ${totalComponents} total component instances detected
- ${totalInteractions} interactive state declarations found

---

## System Instructions

You are an expert frontend engineer. Your task is to replicate the design of the Inspiration site (\`${siteRoot}\`) onto the Target site. Follow these rules with extreme precision:

### Rule 1 — Design Tokens First
Before writing any CSS:
1. Open \`design-tokens.md\`
2. Define CSS custom properties (variables) for **every** color in the palette, every font in the typography table, and every spacing value
3. Use these variables exclusively — no hardcoded values

\`\`\`css
/* Example: define from design-tokens.md */
:root {
  --color-primary: /* hex from palette */;
  --font-heading: /* font-family from typography table */;
  --spacing-md: /* spacing value from spacing scale */;
  --radius-card: /* radius value from border-radius table */;
}
\`\`\`

### Rule 2 — Component Fidelity
For each component in \`component-inventory.md\`:
1. Match the **exact HTML tag** (e.g., \`<nav>\`, \`<section>\`, \`<article>\`)
2. Match the **display type** (flex or grid) and direction
3. Match child count patterns for layout grids (e.g., 3-column card grids)
4. Apply the **exact class-based structure** where class names reveal layout intent (e.g., \`card-grid\`, \`hero-content\`)

### Rule 3 — Page Structure Fidelity
For each route in \`page-map.md\`:
1. Implement sections in the **exact order** listed under "Per-Page Section Structure"
2. Shared layout elements (header/nav/footer) detected across pages must be extracted into **layout components**
3. Match the semantic HTML landmarks: \`<header>\`, \`<main>\`, \`<aside>\`, \`<footer>\`

### Rule 4 — Interaction Accuracy
For every interactive element:
1. Open \`interaction-spec.md\`
2. Apply the exact CSS properties for \`:hover\`, \`:focus\`, \`:active\` states
3. Replicate all \`transition\` properties with the same **duration** and **easing function**
4. If keyframe animations are listed, recreate them with matching timing
5. For form inputs, implement all validation states found in "Form Validation & Input States"

### Rule 5 — Responsive Behavior
1. Use the breakpoints defined in \`design-tokens.md\` to structure your \`@media\` queries
2. For each component in \`component-inventory.md\`, match responsive layout changes:
   - Flex → stacked (column) at mobile breakpoints
   - Grid columns → reduced at tablet/mobile breakpoints
   - Nav → hamburger/drawer at the smallest breakpoint

### Rule 6 — Dynamic Fallbacks
For any component or pattern NOT explicitly documented in the supplementary files, apply these fallback rules:
- **Colors:** Pick the closest color from the palette using visual weight (primary CTA → use the most saturated color; backgrounds → use the lightest color)
- **Spacing:** Default to the median value from the spacing scale for unknown gaps
- **Typography:** Unknown text elements inherit from the nearest defined parent tag in the typography table
- **Animations:** Apply the most common transition value from the transitions table as a default
- **Layout:** Default to the most common \`display\` type observed in the component inventory (usually \`flex\`)

---

## Page-by-Page Replication Instructions

${pages.map((page) => {
  let urlPath = '/';
  try { urlPath = new URL(page.url).pathname || '/'; } catch {}
  const sectionList = (page.sections || [])
    .slice(0, 10)
    .map((s) => `   ${s.order}. \`${s.tag}\`${s.heading ? ` — "${s.heading}"` : ''}`)
    .join('\n');
  const compTypes = [...new Set((page.components || []).map((c) => c.type))].join(', ');
  return `### Page: \`${urlPath}\` — ${page.title || 'Untitled'}

**Detected sections (implement in this order):**
${sectionList || '   _No explicit sections — use standard header/main/footer structure_'}

**Component types on this page:** ${compTypes || 'N/A'}

**Implementation checklist:**
- [ ] Implement layout structure matching section order above
- [ ] Apply all component patterns from \`component-inventory.md\` for: ${compTypes || 'base layout'}
- [ ] Apply all design tokens from \`design-tokens.md\`
- [ ] Add all interaction states from \`interaction-spec.md\` to interactive elements
- [ ] Verify responsive behavior at all breakpoints from \`design-tokens.md\`
`;
}).join('\n---\n\n')}

---

## Final Quality Checklist

Before delivering the replicated site, verify:

- [ ] All CSS variables defined from \`design-tokens.md\` — no hardcoded colors/fonts
- [ ] Every page route in \`page-map.md\` has been implemented
- [ ] Section order matches "Per-Page Section Structure" for each page
- [ ] All hover/focus/active states from \`interaction-spec.md\` applied
- [ ] All transitions/animations from \`interaction-spec.md\` implemented
- [ ] Responsive at all breakpoints from \`design-tokens.md\`
- [ ] Shared layout components (shared elements from \`page-map.md\`) are reusable
- [ ] Form states (if any) implemented per \`interaction-spec.md\`

---

*This prompt was auto-generated by the Design Crawler tool.*
*Source: ${siteRoot} | Pages crawled: ${pages.length}*
`;

  fs.writeFileSync(path.join(outputPath, 'replication-prompt.md'), prompt);
  console.log('  ✅ replication-prompt.md');
  return prompt;
}

module.exports = { generate };
