#!/usr/bin/env node
/**
 * Сверяет реестр страниц (src/data/site/pages.json) со статическими маршрутами шаблона.
 *
 * Реестр живёт в данных (astro-json), маршруты — в коде. Без этой проверки
 * они расходятся молча: добавили страницу в src/pages и забыли описать.
 *
 * Динамические маршруты и служебные страницы в сверке не участвуют:
 * их набор зависит от контента дилера, а не от шаблона.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Страницы, которых не должно быть в реестре: служебная 404 и главная.
 * Главную нельзя выключить, а правило `/` в списке выключенных совпало бы
 * префиксом с любым URL и вычистило бы все пункты всех меню.
 */
const IGNORED_SLUGS = new Set(['404', 'index']);

const isDynamic = (slug) => slug.includes('[');

/**
 * Отслеживаемые git-ом страницы шаблона.
 *
 * Именно git, а не обход каталога: в `src/pages/` во время работы лежат ещё десятки
 * `.astro`, скопированных туда пайплайном `sync_remote_pages` из бренд-слоёв astro-json.
 * Они принадлежат данным конкретного дилера, а не шаблону, и в сверку входить не должны.
 */
export function trackedPageFiles(repoRoot) {
	return execFileSync(
		'/usr/bin/git',
		['-C', repoRoot, 'ls-files', 'src/pages/*.astro', 'src/pages/**/*.astro'],
		{ encoding: 'utf8' },
	)
		.split('\n')
		.filter(Boolean);
}

/** Слаги маршрутов по списку файлов: src/pages/contacts.astro → 'contacts', src/pages/models/index.astro → 'models'. */
export function collectRouteSlugs(files) {
	return files
		.map((file) => file.replace(/^src\/pages\//, '').replace(/\.astro$/, ''))
		.map((slug) => (slug.endsWith('/index') ? slug.slice(0, -'/index'.length) : slug))
		.filter((slug) => slug !== '' && !isDynamic(slug) && !IGNORED_SLUGS.has(slug))
		.sort();
}

export function comparePagesToRoutes(pages, routeSlugs) {
	const routes = new Set(routeSlugs);
	const registrySlugs = new Set();

	for (const entry of Object.values(pages ?? {})) {
		if (!entry || typeof entry !== 'object') continue;
		if (typeof entry.collection === 'string') continue;
		if (typeof entry.url !== 'string') continue;
		registrySlugs.add(entry.url.replace(/^\/+/, '').replace(/\/+$/, ''));
	}

	return {
		missingInRegistry: [...routes].filter((slug) => !registrySlugs.has(slug)).sort(),
		missingInPages: [...registrySlugs]
			.filter((slug) => !routes.has(slug))
			.map((slug) => `/${slug}/`)
			.sort(),
	};
}

const main = () => {
	const pagesJsonPath = path.join(ROOT, 'src/data/site/pages.json');
	if (!fs.existsSync(pagesJsonPath)) {
		console.error('❌ src/data/site/pages.json не найден. Сначала pnpm downloadCommonRepo --local');
		process.exit(1);
	}

	const pages = JSON.parse(fs.readFileSync(pagesJsonPath, 'utf8'));
	const slugs = collectRouteSlugs(trackedPageFiles(ROOT));
	const { missingInRegistry, missingInPages } = comparePagesToRoutes(pages, slugs);

	if (missingInRegistry.length === 0 && missingInPages.length === 0) {
		console.log(`✔ Реестр и маршруты совпадают (${slugs.length} маршрутов)`);
		return;
	}

	if (missingInRegistry.length > 0) {
		console.error('❌ Маршруты шаблона без записи в pages.json:');
		for (const slug of missingInRegistry) console.error(`   /${slug}/`);
		console.error('   Добавьте записи в astro-json/data/json/pages.json');
	}
	if (missingInPages.length > 0) {
		console.error('❌ Записи pages.json без маршрута в src/pages:');
		for (const url of missingInPages) console.error(`   ${url}`);
		console.error('   Уберите записи из astro-json/data/json/pages.json');
	}
	process.exit(1);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
