#!/usr/bin/env node
// Simple brand switcher for Tailwind v4 @theme based setup.
// Usage:
//   node .github/scripts/setBrand.mjs toyota
//   ASTRO_ACTIVE_BRAND=toyota node .github/scripts/setBrand.mjs
// It generates src/scss/brand.css that imports base tokens and brand overrides.

import fs from 'node:fs'
import path from 'node:path'

const brandFromArg = process.argv[2]?.trim()
const brandFromEnv = process.env.ASTRO_ACTIVE_BRAND?.trim()
let brand = brandFromArg || brandFromEnv

if (!brand) {
  // Try reading from src/data/settings.json
  try {
    const settingsPath = path.join(process.cwd(), 'src', 'data', 'settings.json')
    const raw = fs.readFileSync(settingsPath, 'utf8')
    const settings = JSON.parse(raw)
    brand = (settings?.site_brand_style || '').trim()
  } catch (_) {
    // ignore, fallback below
  }
}

brand = (brand || '').trim()

const projectRoot = process.cwd()
const brandCssPath = path.join(projectRoot, 'src', 'scss', 'brand.css')
let content = `/* Active brand theme aggregator - auto generated */\n`
if (brand) {
  const brandThemeRelPath = `./brands/${brand}.css`
  content += `@import '${brandThemeRelPath}';\n`
}

fs.writeFileSync(brandCssPath, content, 'utf8')
console.log(`[setBrand] Active brand: ${brand} -> wrote ${path.relative(projectRoot, brandCssPath)}`)


