# Design Crawler 🕷️

An AI-ready web design extraction tool built with **Playwright**. Crawls any website and generates 5 structured markdown files ready for LLM-driven UI replication.

---

## Deliverables Generated

| File | Contents |
|------|----------|
| `design-tokens.md` | Color palette, typography, spacing, radii, shadows, breakpoints |
| `component-inventory.md` | All UI components: navbars, heroes, cards, forms, footers etc. |
| `page-map.md` | Route list, per-page section order, shared layout elements |
| `interaction-spec.md` | Hover/focus/active states, transitions, animations, scroll patterns |
| `replication-prompt.md` | Master LLM prompt with per-page replication checklists |

---

## Installation

```bash
cd design-crawler
npm install
npx playwright install chromium
```

---

## Usage

```bash
# Basic usage (crawl up to 30 pages)
node index.js --url https://example.com

# Custom page limit and output directory
node index.js --url https://stripe.com --output ./stripe-output --max-pages 50
```

### Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--url` | `-u` | Target website URL **(required)** | — |
| `--output` | `-o` | Output directory | `./output` |
| `--max-pages` | `-m` | Maximum pages to crawl | `30` |

---

## Output Example

```
output/
├── design-tokens.md        ← Colors, fonts, spacing, shadows
├── component-inventory.md  ← All UI components and their layouts
├── page-map.md             ← Routes and section structure
├── interaction-spec.md     ← Hover/focus/active states
├── replication-prompt.md   ← Master LLM prompt
└── raw-data.json           ← Raw extracted JSON (for debugging)
```

---

## How It Works

1. **BFS Crawl** — Playwright's Chromium browser visits every internal page (up to `--max-pages`)
2. **In-Browser Extraction** — `page.evaluate()` runs inside each page to extract:
   - Computed CSS (colors, fonts, spacing, radii, shadows, transitions)
   - `@media` rules for responsive breakpoints
   - `:hover`, `:focus`, `:active` pseudo-class declarations from stylesheets
   - DOM structure (sections, semantic landmarks, component patterns)
3. **Markdown Generation** — All data is deduplicated and formatted into the 5 deliverable files
4. **LLM Prompt** — `replication-prompt.md` is the master prompt that references the other 4 files and provides per-page implementation checklists

---

## Requirements

- Node.js >= 18
- Internet access to target website
