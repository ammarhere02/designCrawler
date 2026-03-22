#!/usr/bin/env node
/**
 * index.js — Design Crawler Entry Point
 * Usage: node index.js --url <target-url> [--output ./output] [--max-pages 30]
 */

const { program } = require('commander');
const path = require('path');
const fs = require('fs');

const { crawl } = require('./crawler');
const designTokensGen = require('./generators/design-tokens');
const componentInventoryGen = require('./generators/component-inventory');
const pageMapGen = require('./generators/page-map');
const interactionSpecGen = require('./generators/interaction-spec');
const replicationPromptGen = require('./generators/replication-prompt');
const coverageVerificationGen = require('./generators/coverage-verification');

program
  .name('design-crawler')
  .description('Extract UI/UX design from any website and generate structured markdown for LLM-driven replication')
  .version('1.0.0')
  .requiredOption('-u, --url <url>', 'Target website URL to crawl (e.g. https://stripe.com)')
  .option('-o, --output <dir>', 'Output directory for generated .md files', './output')
  .option('-m, --max-pages <number>', 'Maximum number of pages to crawl', '30')
  .parse(process.argv);

const options = program.opts();
const targetUrl = options.url;
const outputDir = path.resolve(options.output);
const maxPages = parseInt(options.maxPages, 10) || 30;

async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║          🕷️  Design Crawler v1.0.0               ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
  console.log(`  Target URL : ${targetUrl}`);
  console.log(`  Output Dir : ${outputDir}`);
  console.log(`  Max Pages  : ${maxPages}\n`);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // ── PHASE 1: CRAWL ──
  console.log('📡 Phase 1: Crawling website...\n');
  let pages;
  try {
    pages = await crawl(targetUrl, { maxPages, outputPath: outputDir });
  } catch (err) {
    console.error(`\n❌ Crawl failed: ${err.message}`);
    process.exit(1);
  }

  if (!pages || pages.length === 0) {
    console.error('\n❌ No pages were successfully crawled. Check the URL and your network connection.');
    process.exit(1);
  }

  // ── PHASE 2: GENERATE MARKDOWN FILES ──
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
    console.error(err.stack);
    process.exit(1);
  }

  // ── SUMMARY ──
  const files = [
    'design-tokens.md',
    'component-inventory.md',
    'page-map.md',
    'interaction-spec.md',
    'replication-prompt.md',
    'coverage-verification.md',
    'raw-data.json',
  ];

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║          ✅ Design Package Complete               ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
  console.log(`  Pages crawled : ${pages.length}`);
  console.log(`  Output dir    : ${outputDir}\n`);
  console.log('  Generated files:');
  files.forEach((file) => {
    const filePath = path.join(outputDir, file);
    if (fs.existsSync(filePath)) {
      const size = (fs.statSync(filePath).size / 1024).toFixed(1);
      console.log(`    ✅ ${file.padEnd(28)} (${size} KB)`);
    }
  });
  console.log('\n  📦 Hand off the 5 .md files to your client.\n');
}

main();
