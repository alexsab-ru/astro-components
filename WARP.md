# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Key commands

### Environment & setup

- Install Node dependencies (pnpm is expected):
  - `pnpm install`
- Prepare `.env` from the example:
  - macOS/Linux: `pnpm start` (runs `cp .env.example .env`)
  - Windows: `pnpm start_win`
- (Optional) Python tooling (for XML/feed processing):
  - `pnpm python` — prints the virtualenv + `pip install -r requirements.txt` commands to run.

### Development server & build

- Run local dev server with local config:
  - `pnpm dev` → `astro dev --open --host --config astro.local.config.mjs`
- Build for local config:
  - `pnpm build_local` → `astro build --config astro.local.config.mjs`
- Production build:
  - `pnpm build` → `astro build`
- Preview built site:
  - `pnpm preview` → `astro preview --open --host`

### Content & data preparation

Most data for pages is pulled from remote JSON and XML feeds via scripts in `.github/scripts` and `@alexsab-ru/scripts`.

Common workflows:

- Download JSON data into `src/data` (requires `JSON_REPO` and `DOMAIN` in `.env`):
  - `pnpm downloadCommonRepo` — clones repo and copies data from `src/$DOMAIN/data`, model-sections, models.json, cars.json
  - Windows: use WSL or Git Bash; `pnpm downloadCommonRepo` runs via bash
- Full data refresh for dealer feeds + prices (new + used cars, photos, air storage):
  - `pnpm getAll`
- Individual feed downloads (examples):
  - `pnpm getDealerStorage_new_cars_xml`
  - `pnpm getDealerStorage_used_cars_xml`
  - `pnpm getOne_DEALER_PHOTOS_FOR_CARS_AVITO_URL`
- Update air storage and site data from XML (examples):
  - `pnpm update_cars_air_storage_avito`
  - `pnpm update_cars_air_storage_autoru`
  - `pnpm update_cars_data_cars_car`
  - `pnpm update_cars_used_cars_data_cars_car`

A combined "download JSON + XML + prices and start dev" flow exists:

- macOS/Linux: `pnpm dd` — runs `downloadCommonRepo` plus dealer prices, merge, placeholders, then starts dev
- Windows: use WSL or Git Bash to run `pnpm dd`

### Link checking & Lighthouse

- Local link check against a dev server:
  - `pnpm test_links_local` → starts `astro dev` on port 4343, runs `.github/scripts/checkLinks/checkLinks.js`, then kills dev.
- Link check against a production/staging domain:
  - `pnpm test_links_production`
- Local link test harness:
  - `pnpm test_local`
- Lighthouse audit (build + preview + lighthouse):
  - `pnpm lighthouse`

### XML feed testing

XML feeds are tested via the `pnpm cars` subcommands (provided by `@alexsab-ru/scripts`). Examples:

- Test Avito and Autoru feeds:
  - `pnpm test_AVITO_XML_URL`
  - `pnpm test_AUTORU_XML_URL`
- Test "new cars" feeds in dev mode:
  - `pnpm test_XML_URL_DATA_CARS_CAR`
  - `pnpm test_XML_URL_VEHICLES_VEHICLE`
- Test "used cars" feeds in dev mode:
  - `pnpm test_USED_CARS_DATA_CARS_CAR`
  - `pnpm test_USED_CARS_VEHICLES_VEHICLE`

### Helper scripts

Selected helper scripts exposed via `package.json`:

- Filter models by brand:
  - `pnpm filterModelsByBrand`
- Merge car prices JSON:
  - `pnpm mergeCarPrices`
- Replace placeholders and search dates in content/data:
  - `pnpm replacePlaceholdersAndSearchDates`
- Generate a git commit report CSV:
  - `pnpm get_report`

### Python XML tooling (from `.github/scripts/README.md`)

Typical flow for building Avito XML exports and updating site inventory:

- Build air storage and Avito XMLs (high-level example, see `.github/scripts/README.md` for details):
  - `pnpm getAirStorage`
  - `pnpm getOneXML_Ads_Ad`
  - `pnpm getOneXML_Ads_Ad_friend`
  - Run `update_cars_air_storage.py` with appropriate `--source_type` and `--config_*` options.
- Update site data from XML feeds:
  - `python .github/scripts/update_cars.py --source_type data_cars_car --image_tag="image"`
  - `python .github/scripts/update_cars.py --source_type maxposter --image_tag="photo"`

Refer to `.github/scripts/README.md` for complete command sequences, environment-variable configuration, and options.

## High-level architecture

### Overall structure

- Astro project using `astro@5` with React, MDX, Tailwind, Alpine.js, sitemap and robots integrations.
- TypeScript is configured via `tsconfig.json` with alias `@/*` → `src/*`.
- Data-driven site: content and navigation are primarily generated from JSON/YAML files under `src/data` and content collections.

Key top-level directories under `src`:

- `src/pages` — Astro page routes (cars catalog, collections, models, etc.).
- `src/components` — Reusable UI components (cars listing, banners, header, forms, SEO blocks, etc.).
- `src/layouts` — Layout wrappers (e.g. `PageLayout.astro`) that centralize meta, header/footer, breadcrumbs, and common structure.
- `src/content` / `content.config.ts` — Astro content collections (e.g. `cars` collection and various MDX-based collections such as news, offers, etc.).
- `src/data` — JSON/YAML configuration for settings, models, salons, menu, collections, etc.; filled or updated by Node/Python scripts.
- `src/js` — Utility functions (dates, number formatting, sorting/filtering, grouping, etc.).
- `src/store` — Client-side state (e.g. Alpine/React/Zustand-powered logic) for interactive widgets.
- `src/scss` — Global and component-level styles, in addition to Tailwind.

### Routing and collections

- Dynamic collection pages: `src/pages/[collection]/index.astro`
  - Uses `getStaticPaths` + `collectionsData` (`@/data/collections.json`) to expose arbitrary Astro content collections under `/{collection}/`.
  - Reads entries via `getCollection` from `astro:content` and passes them through `sortingAndFilteringPosts`.
  - Picks a random image for page meta using `getRandomInt`.
  - Renders a grid of `PostItem` components and an MDX SEO block via `<SeoText mdx={collection} />`.

- Car catalog pages:
  - `src/pages/cars/index.astro` — "Авто в наличии" page, reading a `cars` content collection via `getCollection("cars")` and filtering out entries whose `id` starts with `__`.
  - `src/pages/__catalog/index.astro` — synthetic catalog built from `models.json` rather than content collection:
    - `getReadyCars` synthesizes "car" items from models, colors, and complectations, including SEO meta fields.
    - Derives filter facets (colors, complectations, engines, drives) from generated cars.
    - Uses Alpine (`x-data="sorting"`) and custom JS to handle filtering/sorting on the client side.
    - Renders `CarItem` cards and exposes a sticky "stock" slider section.

- Other routes:
  - `src/pages/__catalog/[...slug].astro`, `src/pages/cars/[...slug].astro`, `src/pages/models/[...slug].astro` implement detail pages for specific cars/models (not listed exhaustively here). They typically pull from content collections and/or `src/data` and use `PageLayout` + specific components.

### Layouts and global configuration

- `PageLayout.astro` (in `src/layouts`) wraps most pages:
  - Accepts `h1`, `title`, `description`, `keywords`, `breadcrumb`, `image`, `backLink`.
  - Central place to hook SEO tags, shared header/footer, scripts, and global slots.
- `src/const.js` centralizes runtime constants and derived data:
  - `TIMER`, `MARQUEE`, `LINK_WIDGET` — used across pages.
  - Menu construction:
    - Loads `settings.json`, `models.json`, `salons.json`, `menu.json`.
    - Uses `groupArrayByKey` and `dynamicMenuConfig` to build nested menu items (`childrenGroup`) based on models grouped by brand.
    - Attempts to import `menu.json` dynamically and mutates menu items whose `children` is one of the supported dynamic types (currently `models`).
    - Exports `LINKS_MENU` for header/menu components.
  - `AGREE_LABEL` — HTML consent text for forms.
  - `FOOTER_INFO` — legal footer text with dynamically built phone list.

### Components

Components are grouped by feature, not by technical type:

- `src/components/Cars/*` — list, item, preview slider, sort select, etc. for cars/catalog views.
- `src/components/Banner/*` — banner layout, image/video, title, description, SCSS/JS for hero banners.
- `src/components/Header/*` — main header, menu, submenu, with associated SCSS and tests (`tests/test-menu.js` and checklist markdown).
- `src/components/Seo/Index.astro` — renders MDX-based SEO text blocks keyed by collection/slug.
- `src/components/FeedbackForm/*`, `src/components/Cookie/Cookie.astro`, `src/components/DisclaimerCollapse/DisclaimerCollapse.astro` — forms and legal UI.

Future changes should generally follow this feature-based component organization and reuse existing utilities and constants from `src/const.js`, `src/js/utils`, and `src/data`.

### Data & scripts

- Data pipeline is split between Node (pnpm scripts using `@alexsab-ru/scripts`) and Python scripts in `.github/scripts`:
  - Node side orchestrates fetching JSON files, merging car prices, and preparing data in `src/data`.
  - Python side focuses on XML feeds (Avito, Autoru, Maxposter, etc.) and generating/merging air storage XMLs and site inventories.
- The Astro app reads from the resulting JSON/YAML/XML-derived outputs, especially:
  - `settings.json` — brand/site-level configuration and legal city.
  - `models.json` — model catalog used for `__catalog`, menu construction, and dynamic links.
  - `salons.json` — dealer locations, used in footer and possibly contact sections.
  - `collections.json` — config for dynamic content collections.

## Notes for future Warp agents

- Use `pnpm dev` with `astro.local.config.mjs` during local development; production builds use the default `astro.config.mjs`.
- When working on navigation or catalog pages, prefer to modify `src/data/*` and `src/const.js` rather than hardcoding values inside page components.
- Before relying on data-driven pages, ensure `src/data` has been populated via the appropriate `pnpm downloadCommonRepo` / `pnpm getAll` / Python flows, otherwise some pages may render empty states.
