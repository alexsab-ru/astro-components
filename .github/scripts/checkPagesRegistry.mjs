#!/usr/bin/env node
/**
 * Сверяет реестр страниц шаблона (astro-json/data/json/pages.json) со статическими
 * маршрутами шаблона (src/pages в astro-components).
 *
 * Реестр живёт в данных (astro-json), маршруты — в коде. Без этой проверки
 * они расходятся молча: добавили страницу в src/pages и забыли описать.
 *
 * Сверяем именно с дефолтным слоем шаблона, а не с итоговым src/data/site/pages.json:
 * тот — результат слияния общий → бренд → дилер, и в нём законно встречаются
 * дилерские записи (`/about/`, `/iov/`, `/for-owners/`, ...), для которых в
 * src/pages шаблона файла нет и быть не должно. Сверка с ним даёт ложные
 * ошибки на дилерских сайтах.
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

	for (const [key, entry] of Object.entries(pages ?? {})) {
		if (!entry || typeof entry !== 'object') continue;
		if (typeof entry.collection === 'string') continue;
		registrySlugs.add(key.replace(/^\/+/, '').replace(/\/+$/, ''));
	}

	return {
		missingInRegistry: [...routes].filter((slug) => !registrySlugs.has(slug)).sort(),
		missingInPages: [...registrySlugs]
			.filter((slug) => !routes.has(slug))
			.map((slug) => `/${slug}/`)
			.sort(),
	};
}

/**
 * Путь к корню соседнего репозитория astro-json.
 *
 * Тот же способ, что и `--local` в downloadCommonRepo.sh: соседняя директория
 * `../astro-json` по умолчанию, переопределяется той же переменной окружения
 * (ASTRO_JSON_LOCAL_PATH), чтобы не плодить второе имя для одного и того же пути.
 */
export function astroJsonRoot(repoRoot) {
	const astroJsonPath = process.env.ASTRO_JSON_LOCAL_PATH || '../astro-json';
	return path.resolve(repoRoot, astroJsonPath);
}

/** Путь к дефолтному реестру страниц шаблона в соседнем репозитории astro-json. */
export function templatePagesJsonPath(repoRoot) {
	return path.join(astroJsonRoot(repoRoot), 'data/json/pages.json');
}

/**
 * Пути ко всем файлам реестра всех слоёв: дефолт (data/json/pages.json) и
 * каждый дилерский диф (src/<домен>/pages.json). Отсутствующие файлы пропускаются —
 * не у каждого дилера есть свой pages.json.
 */
export function listRegistryFiles(repoRoot) {
	const root = astroJsonRoot(repoRoot);
	const files = [];

	const defaultPath = path.join(root, 'data/json/pages.json');
	if (fs.existsSync(defaultPath)) files.push(defaultPath);

	const srcDir = path.join(root, 'src');
	if (fs.existsSync(srcDir)) {
		for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue;
			const dealerPath = path.join(srcDir, entry.name, 'pages.json');
			if (fs.existsSync(dealerPath)) files.push(dealerPath);
		}
	}

	return files;
}

/**
 * Приводит ключ реестра к строгому каноническому виду для этой проверки:
 * один ведущий и один завершающий слэш, без query/якоря, без пустых сегментов
 * (то есть без двойных слэшей).
 *
 * Это НЕ то же самое, что normalizePageUrl из src/js/utils/sitePages.js: та функция
 * снисходительна к рантайм-сравнению путей (не схлопывает двойные слэши — на реальных
 * URL их и так не бывает), а здесь мы, наоборот, ловим именно опечатки в исходных
 * данных, поэтому проверяем строже.
 */
export function canonicalizeRegistryKey(key) {
	if (typeof key !== 'string') return '/';
	const withoutTail = key.split('#')[0].split('?')[0];
	const segments = withoutTail.split('/').filter(Boolean);
	return segments.length > 0 ? `/${segments.join('/')}/` : '/';
}

/**
 * Проверяет канонический вид ключей одного файла реестра.
 *
 * Ключ реестра — это URL, и склейка слоёв (deepMerge) сливает записи по точному
 * совпадению строки ключа. Два случая ловим здесь:
 *  - ключ записан не канонически (без ведущего/завершающего слэша, двойные
 *    слэши, `?`/`#` в строке) — такая запись не сольётся с канонической версией
 *    того же URL в другом слое;
 *  - два ключа одного файла после нормализации дают один и тот же URL — то есть
 *    один из них лишний или опечатка, и который из двух реально применится,
 *    решает порядок ключей в объекте, а не намерение автора.
 */
export function checkCanonicalKeys(filePath, pages) {
	const problems = [];
	const byNormalized = new Map();

	for (const key of Object.keys(pages ?? {})) {
		const canonical = canonicalizeRegistryKey(key);
		if (canonical !== key) {
			problems.push({
				file: filePath,
				key,
				message: `ключ "${key}" не в каноническом виде — используйте "${canonical}"`,
			});
		}
		const bucket = byNormalized.get(canonical) ?? [];
		bucket.push(key);
		byNormalized.set(canonical, bucket);
	}

	for (const [canonical, keys] of byNormalized) {
		if (keys.length > 1) {
			problems.push({
				file: filePath,
				key: keys.join(' и '),
				message: `ключи ${keys.map((k) => `"${k}"`).join(' и ')} после нормализации дают один и тот же URL "${canonical}" — оставьте одну запись`,
			});
		}
	}

	return problems;
}

/** Проверяет канонический вид ключей во всех файлах реестра всех слоёв. */
export function checkAllRegistryFiles(repoRoot) {
	const problems = [];
	for (const filePath of listRegistryFiles(repoRoot)) {
		const pages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
		problems.push(...checkCanonicalKeys(filePath, pages));
	}
	return problems;
}

const main = () => {
	const pagesJsonPath = templatePagesJsonPath(ROOT);
	if (!fs.existsSync(pagesJsonPath)) {
		console.error(`❌ ${pagesJsonPath} не найден.`);
		console.error('   Ожидается соседний репозиторий astro-json (см. --local в downloadCommonRepo).');
		console.error('   Переопределить путь: ASTRO_JSON_LOCAL_PATH=/путь/до/astro-json');
		process.exit(1);
	}

	let hasErrors = false;

	const pages = JSON.parse(fs.readFileSync(pagesJsonPath, 'utf8'));
	const slugs = collectRouteSlugs(trackedPageFiles(ROOT));
	const { missingInRegistry, missingInPages } = comparePagesToRoutes(pages, slugs);

	if (missingInRegistry.length === 0 && missingInPages.length === 0) {
		console.log(`✔ Реестр и маршруты совпадают (${slugs.length} маршрутов)`);
	} else {
		hasErrors = true;
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
	}

	const keyProblems = checkAllRegistryFiles(ROOT);
	if (keyProblems.length === 0) {
		console.log('✔ Ключи реестра во всех слоях канонические');
	} else {
		hasErrors = true;
		console.error('❌ Ключи реестра не в каноническом виде:');
		for (const problem of keyProblems) {
			console.error(`   ${path.relative(astroJsonRoot(ROOT), problem.file)}: ${problem.message}`);
		}
	}

	if (hasErrors) process.exit(1);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
