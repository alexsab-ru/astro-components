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
const brand = brandFromArg || brandFromEnv || 'toyota'

const projectRoot = process.cwd()
const brandCssPath = path.join(projectRoot, 'src', 'scss', 'brand.css')
const brandThemeRelPath = `./brands/theme.${brand}.css`

const content = `/* Active brand theme aggregator - auto generated */
@import './brands/theme.base.css';
@import '${brandThemeRelPath}';
`

fs.writeFileSync(brandCssPath, content, 'utf8')
console.log(`[setBrand] Active brand: ${brand} -> wrote ${path.relative(projectRoot, brandCssPath)}`)


