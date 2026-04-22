/**
 * Настройки из src/data/routes.json (приходит из astro-json).
 *
 * Зачем этот модуль, если есть хук strip-disabled в astro.config?
 * - При `astro build` фронтматтер каждой страницы тоже выполняется: здесь мы режем getStaticPaths
 *   и делаем ранний Astro.redirect — это основной способ «не отдавать» раздел.
 * - В `astro dev` хука финальной сборки нет — логику «не отдавать» дублирует middleware (rewrite на /404) и сами страницы.
 * - Хук после сборки дополнительно удаляет каталоги из dist (подстраховка и единый контракт с disabled_routes).
 *
 * Как отключить любой раздел: добавьте путь в disabled_routes, например "/models/", "/trade-in/".
 * Префикс с завершающим слэшем отключает всё дерево URL (/models/foo/ тоже).
 *
 * Кастомная 404: в .astro вместо `new Response` используйте `return Astro.rewrite(SITE_NOT_FOUND_PATH)` —
 * тогда отрисуется src/pages/404.astro, URL в адресной строке не сменится.
 */
import routes from '../../data/routes.json';

const disabled = Array.isArray(routes.disabled_routes) ? routes.disabled_routes : [];

/** Путь к странице 404.astro; для `return Astro.rewrite(SITE_NOT_FOUND_PATH)` в frontmatter. */
export const SITE_NOT_FOUND_PATH = '/404';

/** Сырой список (редко нужен снаружи; например для отладки) */
export function getDisabledRoutes() {
	return disabled;
}

function normalizePath(pathname) {
	if (!pathname || typeof pathname !== 'string') return '/';
	return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

/**
 * Совпадение пути с одним из правил: точное или префикс, если правило заканчивается на /.
 * Подходит для disabled_routes и sitemap_ignore.
 */
export function pathMatchesRouteRules(pathname, rules) {
	if (!Array.isArray(rules) || rules.length === 0) return false;
	const p = normalizePath(pathname);
	// /redirect и /redirect/ считаем одним путём (trailingSlash у Astro может не совпадать с правилом)
	const pDir = p === '/' || p.endsWith('/') ? p : `${p}/`;
	for (const raw of rules) {
		const r = normalizePath(raw);
		if (p === r || pDir === r) return true;
		if (r.endsWith('/') && (p.startsWith(r) || pDir.startsWith(r))) return true;
		if (!r.endsWith('/') && (p === r || pDir === r || p.startsWith(`${r}/`))) return true;
	}
	return false;
}

/**
 * Удобная обёртка: отключён ли URL в рамках текущего сайта (по disabled_routes).
 * Пример: isRouteDisabled('/models/'), isRouteDisabled('/trade-in/')
 */
export function isRouteDisabled(pathname) {
	return pathMatchesRouteRules(pathname, disabled);
}
