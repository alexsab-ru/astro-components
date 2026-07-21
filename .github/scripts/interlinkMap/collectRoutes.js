/**
 * Собирает полный список URL текущей сборки из исходников (без build).
 * Учитывает disabled_routes из routes.json и dedicated-маршруты коллекций.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PAGES_DIR = path.join(ROOT, 'src/pages');
const CONTENT_DIR = path.join(ROOT, 'src/content');
const DATA_DIR = path.join(ROOT, 'src/data/site');
const CONTENT_EXTENSIONS = ['.md', '.mdx'];
const SPECIAL_COLLECTIONS = new Set(['cars', 'seo', 'used_cars']);

/** Dedicated-маршруты: коллекция → префикс URL (без [collection]) */
const DEDICATED_COLLECTION_PREFIX = {
	autoservice: '/autoservice',
	remont: '/remont',
	services: '/services',
	corporate_clients: '/corporate_clients',
	about: '/about',
	cars: '/cars',
	used_cars: '/used_cars',
};

/** Читает JSON из src/data/site/ */
function readSiteJson(name) {
	const filePath = path.join(DATA_DIR, `${name}.json`);
	if (!fs.existsSync(filePath)) return null;
	return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/** Проверка disabled_routes (упрощённая копия pathMatchesRouteRules) */
function isRouteDisabled(pathname, disabledRoutes) {
	const normalized = pathname.endsWith('/') ? pathname : `${pathname}/`;
	return disabledRoutes.some((rule) => {
		const r = rule.endsWith('/') ? rule : `${rule}/`;
		return normalized === r || normalized.startsWith(r);
	});
}

/** Рекурсивно собирает id записей контента (blog/foo, individuals/bar) */
function getContentEntryIds(collection) {
	const root = path.join(CONTENT_DIR, collection);
	if (!fs.existsSync(root)) return [];

	const collect = (dir) =>
		fs.readdirSync(dir, { withFileTypes: true }).flatMap((dirent) => {
			const entryPath = path.join(dir, dirent.name);
			if (dirent.isDirectory()) return collect(entryPath);
			if (!dirent.isFile()) return [];

			const ext = CONTENT_EXTENSIONS.find((e) => dirent.name.endsWith(e));
			if (!ext || dirent.name.startsWith('__')) return [];

			return [path.relative(root, entryPath).slice(0, -ext.length).split(path.sep).join('/')];
		});

	return collect(root);
}

/** Есть ли файлы контента в папке коллекции */
function hasContentCollection(collection) {
	const root = path.join(CONTENT_DIR, collection);
	if (!fs.existsSync(root)) return false;

	const walk = (dir) => {
		for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
			const p = path.join(dir, dirent.name);
			if (dirent.isDirectory() && walk(p)) return true;
			if (dirent.isFile() && CONTENT_EXTENSIONS.some((e) => dirent.name.endsWith(e))) return true;
		}
		return false;
	};
	return walk(root);
}

/** Имена обычных коллекций (как getRegularCollectionNames) */
function getRegularCollectionNames() {
	if (!fs.existsSync(CONTENT_DIR)) return [];
	return fs
		.readdirSync(CONTENT_DIR, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name)
		.filter((n) => !n.startsWith('_'))
		.filter((n) => !SPECIAL_COLLECTIONS.has(n))
		.filter(hasContentCollection)
		.sort();
}

/** Статические .astro без динамических сегментов → URL */
function collectStaticPageRoutes(disabledRoutes) {
	const routes = [];

	const walk = (dir, urlPrefix = '') => {
		for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
			const fullPath = path.join(dir, dirent.name);

			if (dirent.isDirectory()) {
				// Пропускаем папки с dynamic routes — URL берём из контента
				if (dirent.name.includes('[')) continue;
				walk(fullPath, `${urlPrefix}/${dirent.name}`);
				continue;
			}

			if (!dirent.name.endsWith('.astro')) continue;
			if (dirent.name.includes('[')) continue;

			const baseName = dirent.name.replace('.astro', '');
			let url;
			if (baseName === 'index') {
				url = urlPrefix ? `${urlPrefix}/` : '/';
			} else {
				url = `${urlPrefix}/${baseName}/`;
			}

			// 404 — служебная страница, не включаем в карту
			if (url === '/404/') continue;

			if (!isRouteDisabled(url, disabledRoutes)) {
				routes.push({ url: canonicalPath(url), source: path.relative(ROOT, fullPath) });
			}
		}
	};

	walk(PAGES_DIR);
	return routes;
}

/** Корневые MDX в src/content/ → /slug/ */
function collectRootContentRoutes(disabledRoutes) {
	if (!fs.existsSync(CONTENT_DIR)) return [];

	return fs
		.readdirSync(CONTENT_DIR, { withFileTypes: true })
		.filter((d) => d.isFile() && CONTENT_EXTENSIONS.some((e) => d.name.endsWith(e)))
		.map((d) => {
			const slug = d.name.replace(/\.(md|mdx)$/, '');
			return { url: `/${slug}/`, source: `src/content/${d.name}` };
		})
		.filter(({ url }) => !isRouteDisabled(url, disabledRoutes))
		.map(({ url, source }) => ({ url: canonicalPath(url), source }));
}

/** URL из коллекций контента */
function collectCollectionRoutes(disabledRoutes, alwaysAvailable) {
	const routes = [];
	const collections = new Set([...getRegularCollectionNames(), ...alwaysAvailable]);

	for (const collection of collections) {
		const indexUrl = `/${collection}/`;
		if (!isRouteDisabled(indexUrl, disabledRoutes)) {
			// index коллекции — если есть index.astro или always_available или есть контент
			const hasIndexPage =
				fs.existsSync(path.join(PAGES_DIR, collection, 'index.astro')) ||
				fs.existsSync(path.join(PAGES_DIR, '[collection]', 'index.astro')) ||
				alwaysAvailable.includes(collection) ||
				hasContentCollection(collection);

			if (hasIndexPage) {
				routes.push({ url: canonicalPath(indexUrl), source: `collection:${collection}/index` });
			}
		}

		// Записи коллекции
		const prefix = DEDICATED_COLLECTION_PREFIX[collection] ?? `/${collection}`;
		if (isRouteDisabled(`${prefix}/`, disabledRoutes)) continue;

		for (const entryId of getContentEntryIds(collection)) {
			const slug = entryIdToSlug(entryId);
			const url = slug ? `${prefix}/${slug}/` : `${prefix}/`;
			if (!isRouteDisabled(url, disabledRoutes)) {
				routes.push({ url: canonicalPath(url), source: `content:${collection}/${entryId}` });
			}
		}
	}

	// Специальные коллекции cars / used_cars
	for (const collection of ['cars', 'used_cars']) {
		const prefix = `/${collection}`;
		if (isRouteDisabled(`${prefix}/`, disabledRoutes)) continue;

		if (fs.existsSync(path.join(PAGES_DIR, collection, 'index.astro'))) {
			routes.push({ url: canonicalPath(`${prefix}/`), source: `collection:${collection}/index` });
		}
		for (const entryId of getContentEntryIds(collection)) {
			const slug = entryIdToSlug(entryId);
			const url = slug ? `${prefix}/${slug}/` : `${prefix}/`;
			if (!isRouteDisabled(url, disabledRoutes)) {
				routes.push({ url: canonicalPath(url), source: `content:${collection}/${entryId}` });
			}
		}
	}

	return routes;
}

/** Приводит path URL к каноническому виду (lowercase + trailing slash) */
function canonicalPath(url) {
	if (url === '/') return '/';
	const lower = url.toLowerCase();
	return lower.endsWith('/') ? lower : `${lower}/`;
}

/** Рекурсивно достаёт URL из menu.json */
export function collectMenuUrls(menuItems, result = new Set()) {
	if (!Array.isArray(menuItems)) return result;

	for (const item of menuItems) {
		if (item?.url && typeof item.url === 'string' && item.url.startsWith('/')) {
			result.add(normalizeUrl(item.url));
		}
		if (item?.children) collectMenuUrls(item.children, result);
	}
	return result;
}

/** Footer legal links по settings.legal */
export function collectFooterUrls(settings) {
	const LEGAL = [
		{ key: 'privacyPolicy', href: '/privacy-policy/' },
		{ key: 'personalDataConsent', href: '/personal-data-consent/' },
		{ key: 'cookiePolicy', href: '/cookie-policy/' },
		{ key: 'advertisingConsent', href: '/advertising-consent/' },
		{ key: 'companySout', href: '/company-sout/' },
		{ key: 'termsOfUse', href: '/terms-of-use/' },
		{ key: 'thirdPartiesPage', href: '/third-parties/' },
	];
	const legal = settings?.legal ?? {};
	return new Set(
		LEGAL.filter((d) => legal[d.key] === true).map((d) => normalizeUrl(d.href)),
	);
}

/**
 * Astro для index.mdx в подпапке даёт slug без /index:
 * content/remont/kia/index.mdx → /remont/kia/, а не /remont/kia/index/
 */
export function entryIdToSlug(entryId) {
	if (entryId.endsWith('/index')) return entryId.slice(0, -'/index'.length);
	if (entryId === 'index') return '';
	return entryId;
}

/** Нормализация URL: только path, trailing slash, lowercase path */
export function normalizeUrl(href, baseOrigin = '') {
	if (!href || typeof href !== 'string') return null;
	if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
		return null;
	}

	let pathname = href;
	try {
		if (href.startsWith('http://') || href.startsWith('https://')) {
			const u = new URL(href);
			// Внешние домены — пропускаем (кроме localhost dev)
			if (baseOrigin) {
				const base = new URL(baseOrigin);
				if (u.origin !== base.origin) return null;
			} else if (!href.includes('127.0.0.1') && !href.includes('localhost')) {
				return null;
			}
			pathname = u.pathname;
		} else if (href.startsWith('//')) {
			return null;
		} else {
			pathname = href.split('#')[0].split('?')[0];
		}
	} catch {
		return null;
	}

	if (!pathname.startsWith('/')) return null;
	// Astro приводит slug к lowercase в URL
	pathname = pathname.toLowerCase();
	if (pathname === '/') return '/';
	return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

/** Главная функция: все URL сборки */
export function collectAllRoutes() {
	const routesData = readSiteJson('routes') ?? {};
	const disabledRoutes = Array.isArray(routesData.disabled_routes) ? routesData.disabled_routes : [];
	const alwaysAvailable = Array.isArray(routesData.always_available_collections)
		? routesData.always_available_collections
		: [];

	const all = [
		...collectStaticPageRoutes(disabledRoutes),
		...collectRootContentRoutes(disabledRoutes),
		...collectCollectionRoutes(disabledRoutes, alwaysAvailable),
	];

	// Дедупликация по URL
	const byUrl = new Map();
	for (const r of all) {
		if (!byUrl.has(r.url)) byUrl.set(r.url, r);
	}

	return {
		routes: [...byUrl.values()].sort((a, b) => a.url.localeCompare(b.url)),
		disabledRoutes,
		domain: process.env.DOMAIN ?? readDomainFromEnv(),
	};
}

function readDomainFromEnv() {
	try {
		const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf-8');
		const m = env.match(/^DOMAIN=(.+)$/m);
		return m ? m[1].trim().replace(/^["']|["']$/g, '') : 'localhost';
	} catch {
		return 'localhost';
	}
}
