/**
 * generators/interaction-spec.js
 * Generates interaction-spec.md from raw crawl data
 */

const fs = require('fs');
const path = require('path');

function groupInteractions(pages) {
  const hover = new Map();
  const focus = new Map();
  const active = new Map();
  const other = new Map();
  const keyframes = [];
  const transitions = new Set();

  pages.forEach((page) => {
    (page.interactionStates || []).forEach((state) => {
      if (state.type === 'keyframe') {
        keyframes.push(state.name);
        return;
      }
      const { selector, styles } = state;
      if (!selector || !styles) return;

      if (/:hover/.test(selector)) hover.set(selector, styles);
      else if (/:focus/.test(selector)) focus.set(selector, styles);
      else if (/:active/.test(selector)) active.set(selector, styles);
      else other.set(selector, styles);
    });

    (page.designTokens?.transitions || []).forEach((t) => transitions.add(t));
  });

  return {
    hover: [...hover.entries()],
    focus: [...focus.entries()],
    active: [...active.entries()],
    other: [...other.entries()],
    keyframes: [...new Set(keyframes)],
    transitions: [...transitions],
  };
}

function renderInteractionTable(entries, lines, label) {
  if (entries.length === 0) return;
  lines.push(`\n### ${label} States\n`);
  lines.push('| Selector | CSS Properties |');
  lines.push('|----------|---------------|');
  entries.slice(0, 30).forEach(([sel, styles]) => {
    const cleanStyles = styles.replace(/\n/g, ' ').slice(0, 120);
    lines.push(`| \`${sel.slice(0, 80)}\` | ${cleanStyles} |`);
  });
}

function generate(pages, outputPath) {
  const { hover, focus, active, other, keyframes, transitions } = groupInteractions(pages);
  const lines = [];

  lines.push('# Interaction Spec\n');
  lines.push(`> Extracted from ${pages.length} page(s). Generated ${new Date().toISOString()}\n`);
  lines.push('This document details all interactive states, animations, and transition behaviors found in the site.\n');

  // ── INTERACTIVE STATES ──
  lines.push('## Interactive States\n');
  renderInteractionTable(hover, lines, 'Hover (`:hover`)');
  renderInteractionTable(focus, lines, 'Focus (`:focus`)');
  renderInteractionTable(active, lines, 'Active (`:active`)');
  renderInteractionTable(other, lines, 'Other Pseudo-States');

  // ── TRANSITIONS ──
  lines.push('\n## Transitions & Animations\n');

  lines.push('\n### CSS Transitions\n');
  if (transitions.length > 0) {
    lines.push('| Transition Value |');
    lines.push('|------------------|');
    transitions.slice(0, 30).forEach((t) => lines.push(`| \`${t.slice(0, 120)}\` |`));
  } else {
    lines.push('_No transitions detected._');
  }

  lines.push('\n### CSS Keyframe Animations\n');
  if (keyframes.length > 0) {
    lines.push('| Animation Name |');
    lines.push('|----------------|');
    keyframes.forEach((k) => lines.push(`| \`${k}\` |`));
  } else {
    lines.push('_No keyframe animations detected._');
  }

  // ── FORM STATES (inferred from pseudo-selectors) ──
  const formStates = [...hover, ...focus, ...active, ...other].filter(([sel]) =>
    /input|select|textarea|checkbox|radio|form/.test(sel)
  );
  if (formStates.length > 0) {
    lines.push('\n## Form Validation & Input States\n');
    lines.push('| Selector | CSS Properties |');
    lines.push('|----------|---------------|');
    formStates.slice(0, 20).forEach(([sel, styles]) => {
      lines.push(`| \`${sel.slice(0, 80)}\` | ${styles.replace(/\n/g, ' ').slice(0, 120)} |`);
    });
  }

  // ── SCROLL / VISIBILITY PATTERNS ──
  lines.push('\n## Scroll & Visibility Patterns\n');
  const scrollClasses = [];
  pages.forEach((page) => {
    (page.components || []).forEach((comp) => {
      const cls = comp.classes || '';
      if (/animate|fade|slide|reveal|visible|aos|scroll|intersect/.test(cls.toLowerCase())) {
        scrollClasses.push(cls.slice(0, 100));
      }
    });
  });
  const uniqueScrollClasses = [...new Set(scrollClasses)];
  if (uniqueScrollClasses.length > 0) {
    lines.push('Detected scroll-triggered or animation-ready class patterns:\n');
    uniqueScrollClasses.slice(0, 20).forEach((cls) => lines.push(`- \`${cls}\``));
  } else {
    lines.push('_No explicit scroll-triggered pattern classes detected. May rely on JS-injected classes._');
  }

  const output = lines.join('\n') + '\n';
  fs.writeFileSync(path.join(outputPath, 'interaction-spec.md'), output);
  console.log('  ✅ interaction-spec.md');
  return output;
}

module.exports = { generate };
