# Design Crawler 🕷️

An AI-ready web design extraction tool built with **Playwright**. Crawls any website (public or authenticated) and generates 6 structured markdown files ready for LLM-driven UI replication and design documentation.

**Perfect for:** Design system extraction, UI component cataloging, design-to-code handoff, and rapid LLM-powered UI replication.

---
## ✨ Features

- 🔍 **Automated Design Extraction** — Extracts colors, typography, spacing, shadows, and animations from live websites
- 🎨 **Design Token Generation** — Organizes all design system elements into structured tokens
- 📦 **Component Inventory** — Catalogs all UI components and their properties
- 📄 **Page Structure Mapping** — Documents page hierarchies and section organization
- ⚡ **Interaction States** — Captures hover, focus, active, and animated states
- 🤖 **LLM-Ready Prompts** — Generates per-page replication checklists for AI-powered UI replication
- 🔐 **Authenticated Crawling** — Optional login flow for crawling gated content

---

## 📋 Deliverables Generated

| File | Purpose | Contents |
|------|---------|----------|
| `design-tokens.md` | Design System Reference | Color palette (Hex & HSL), typography scales, spacing values, border radii, shadows, breakpoints, transitions |
| `component-inventory.md` | Component Library | All UI components detected: navbars, heroes, cards, forms, buttons, modals, inputs with layout & styling |
| `page-map.md` | Site Architecture | All discovered routes, per-page section order, shared layout elements, navigation hierarchy |
| `interaction-spec.md` | Interaction Patterns | Pseudo-class states (:hover, :focus, :active), CSS animations, scroll behaviors, transition timings |
| `replication-prompt.md` | LLM Implementation Guide | Master prompt with per-page checklists, component guidelines, and color/token references |
| `coverage-verification.md` | QA Checklist | Verification guide for design accuracy and component coverage |
| `raw-data.json` | Debug Reference | Complete extracted data in JSON format |

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
npx playwright install chromium
```

### 2. Crawl a Website
```bash
# Public website (30 pages default)
node index.js --url https://example.com

# Crawl 50 pages into custom directory
node index.js --url https://stripe.com --output ./stripe-data --max-pages 50
```

### 3. Use the Output
All markdown files are ready for immediate use:
- Share `design-tokens.md` with your design/dev teams
- Pass `replication-prompt.md` to Claude, ChatGPT, or other LLMs to generate UI code
- Use `component-inventory.md` as a design system reference

---

## 📦 Installation

### Prerequisites
- **Node.js** ≥ 18.0.0
- **Internet connection** to the target website

### Setup

```bash
cd design-crawler
npm install
npx playwright install chromium
```


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

## 🔐 Advanced: Authenticated Crawling

For websites requiring login, use the authenticated crawler:

```bash
node auth-crawler.js \
  --url https://app.example.com \
  --login-url https://app.example.com/signin \
  --email your-email@example.com \
  --password your-password \
  --output ./output-authenticated \
  --max-pages 50 \
  --extra-pages /dashboard,/settings,/profile
```

### Authentication Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--url` | `-u` | Target website URL (required) |
| `--login-url` | `-l` | Login page URL (required for auth) |
| `--email` | `-e` | Email/username for login |
| `--password` | `-p` | Password for login |
| `--output` | `-o` | Output directory | `./output` |
| `--max-pages` | `-m` | Maximum pages to crawl | `30` |
| `--extra-pages` | | Comma-separated additional paths to crawl |

---

## ⚙️ Configuration & Customization

### Adjusting Crawl Depth

```bash
# Shallow crawl (10 pages) - fast, good for testing
node index.js --url https://example.com --max-pages 10

# Deep crawl (100 pages) - comprehensive but slower
node index.js --url https://example.com --max-pages 100
```

### Output Directory Structure

```
output/
├── design-tokens.md        ← Colors, fonts, spacing, shadows
├── component-inventory.md  ← All UI components and their layouts
├── page-map.md             ← Routes and section structure
├── interaction-spec.md     ← Hover/focus/active states & animations
├── replication-prompt.md   ← Master LLM prompt for UI replication
├── coverage-verification.md ← QA checklist
└── raw-data.json           ← Raw extracted JSON (for debugging)
```

---

## 🐛 Troubleshooting

### Issue: "Failed to launch Chromium"
**Solution:** Reinstall Playwright browsers:
```bash
npx playwright install chromium
```

### Issue: "No pages were successfully crawled"
**Troubleshooting:**
- Verify the target URL is correct and accessible
- Check your internet connection
- Try reducing `--max-pages` to test with fewer pages
- Check if the site requires authentication (use `auth-crawler.js`)

### Issue: "Some pages timed out"
**Solution:** The crawler will skip timeouts and continue. Increase the timeout:
```bash
# Modify crawler.js line 250 (page.goto timeout from 30s to 60s)
```

### Issue: Missing design tokens or components
**Notes:**
- Only extracted from rendered CSS (not inline styles in HTML attributes)
- JavaScript-generated styles may not be captured
- Consider increasing `--max-pages` to crawl more pages

---

## 📊 Output Details

### design-tokens.md
Lists all discovered:
- **Colors** in Hex & HSL formats (automatically converted from RGB)
- **Typography** (font families, sizes, weights, line heights)
- **Spacing** values (margins, paddings, gaps)
- **Border Radii** (rounded corners)
- **Shadows** (box-shadow declarations)
- **Transitions** (animation timings)
- **Breakpoints** (responsive media queries)

### component-inventory.md
Catalog of detected components by type:
- Navbars & menus
- Heroes & banners
- Cards & tiles
- Forms & inputs
- Buttons & links
- Modals & dialogs
- Footers & sidebars

### replication-prompt.md
Master LLM prompt with:
- Design token references
- Per-page checklist for UI replication
- Component guidelines
- Color palette & typography scale
- Responsive breakpoint rules

---

## 🚀 Integration with LLMs

### Using with ChatGPT / Claude / Other Models

1. Extract the design data:
```bash
node index.js --url https://example.com
```

2. Copy the content of `replication-prompt.md`

3. Paste into your LLM:
   - **ChatGPT:** Paste into a new conversation
   - **Claude:** Upload the 4 markdown files (design-tokens, component-inventory, page-map, interaction-spec)
   - **Others:** Follow their document upload/paste procedures

4. Ask the LLM to generate code:
   > "Please replicate this design using React/Vue/Svelte following the checklist in the replication-prompt"

---

## Requirements

- **Node.js** ≥ 18.0.0
- **Internet access** to target website
- **2GB+ RAM** for large crawls (100+ pages)

---

## 🔧 How It Works Under the Hood

### Architecture Overview

1. **BFS Crawl** — Playwright's Chromium browser visits every internal page (breadth-first)
   - Starts from root URL
   - Discovers internal links automatically
   - Respects `--max-pages` limit
   - Skips asset files (images, PDFs, fonts, etc.)

2. **In-Browser Extraction** — JavaScript runs inside each page context
   - Extracts computed CSS from all DOM elements
   - Discovers `@media` rules from stylesheets
   - Captures `:hover`, `:focus`, `:active` pseudo-classes
   - Analyzes semantic structure (sections, headers, footers, landmarks)
   - Detects common UI patterns (navbars, cards, forms, etc.)

3. **Data Deduplication** — All extracted data is normalized and deduplicated
   - Color consolidation (RGB → Hex/HSL)
   - Font family standardization
   - Spacing value aggregation
   - Shadow/radius/transition collection

4. **Markdown Generation** — Structured output into 6 deliverable files
   - Design tokens organized by category
   - Component inventory with usage examples
   - Page map with hierarchical structure
   - Interaction specifications
   - LLM-ready replication prompt
   - Coverage verification checklist

### Technology Stack

- **Playwright** — Browser automation & page context execution
- **Chromium** — Headless browser engine
- **Node.js** — JavaScript runtime
- **Commander.js** — CLI argument parsing

---

## 📝 Example Workflow

```bash
# 1. Crawl a design system website
node index.js --url https://design.example.com --output ./example-design --max-pages 20

# 2. Review the extracted tokens
cat ./example-design/design-tokens.md

# 3. Copy the replication prompt
cat ./example-design/replication-prompt.md

# 4. Paste into ChatGPT/Claude with task:
# "Generate React components following this design specification"

# 5. Verify coverage against checklist
cat ./example-design/coverage-verification.md
```

---

## 🛠️ Development & Customization

### Project Structure
```
design-crawler/
├── index.js                  ← Public crawling CLI
├── auth-crawler.js           ← Authenticated crawling CLI
├── crawler.js                ← Core Playwright crawler logic
├── generators/
│   ├── design-tokens.js      ← Token extraction & formatting
│   ├── component-inventory.js ← Component detection
│   ├── page-map.js           ← Route mapping
│   ├── interaction-spec.js   ← Interaction state capture
│   ├── replication-prompt.js ← LLM prompt generation
│   └── coverage-verification.js ← QA checklist generation
├── package.json
└── README.md
```

### Key Extraction Points

| Generator | Extracts | Source |
|-----------|----------|--------|
| design-tokens.js | Colors, fonts, spacing | Computed CSS |
| component-inventory.js | UI components, tags, classes | DOM structure |
| page-map.js | Routes, sections, hierarchy | Internal links + DOM |
| interaction-spec.js | Hover/focus/active states | Stylesheet rules |
| replication-prompt.md | Master prompt + checklists | All generators |

---

## 📄 License

Proprietary — Built for client design system extraction.

---

## 📞 Support

For issues, questions, or feature requests, refer to the troubleshooting section above or contact me
