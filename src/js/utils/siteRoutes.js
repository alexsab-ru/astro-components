/**
 * Настройки из src/data/routes.json (приходит из astro-json).
 *
 * Зачем этот модуль, если есть хук strip-disabled в astro.config?
 * - При `astro build` фронтматтер каждой страницы тоже выполняется: здесь мы режем getStaticPaths
 *   и делаем ранний Astro.redirect — это основной способ «не отдавать» раздел.
 * - В `astro dev` хука финальной сборки нет — без этих проверок отключённые страницы всё равно открывались бы.
 * - Хук после сборки дополнительно удаляет каталоги из dist (подстраховка и единый контракт с disabled_routes).
 *
 * Как отключить любой раздел: добавьте путь в disabled_routes, например "/models/", "/trade-in/".
 * Префикс с завершающим слэшем отключает всё дерево URL (/models/foo/ тоже).
 */
import routes from '../../data/routes.json';

const disabled = Array.isArray(routes.disabled_routes) ? routes.disabled_routes : [];

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
	for (const raw of rules) {
		const r = normalizePath(raw);
		if (p === r) return true;
		if (r.endsWith('/') && p.startsWith(r)) return true;
		if (!r.endsWith('/') && (p === r || p.startsWith(`${r}/`))) return true;
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
