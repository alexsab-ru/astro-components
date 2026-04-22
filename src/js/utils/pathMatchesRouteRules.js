/**
 * Единая логика сопоставления URL с правилами из routes.json
 * (disabled_routes, sitemap_ignore) и в astro.config, и в siteRoutes / middleware.
 *
 * Правило с завершающим / — префикс для всего дерева; /foo и /foo/ считаем одним путём.
 */
function normalizePath(pathname) {
	if (!pathname || typeof pathname !== 'string') return '/';
	return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

/**
 * @param {string} pathname — путь запроса, например /models/ или /redirect
 * @param {string[]} rules — список правил из JSON
 * @returns {boolean}
 */
export function pathMatchesRouteRules(pathname, rules) {
	if (!Array.isArray(rules) || rules.length === 0) return false;
	const p = normalizePath(pathname);
	const pDir = p === '/' || p.endsWith('/') ? p : `${p}/`;
	for (const raw of rules) {
		if (typeof raw !== 'string') continue;
		const r = normalizePath(raw);
		if (p === r || pDir === r) return true;
		if (r.endsWith('/') && (p.startsWith(r) || pDir.startsWith(r))) return true;
		if (!r.endsWith('/') && (p === r || pDir === r || p.startsWith(`${r}/`))) return true;
	}
	return false;
}
