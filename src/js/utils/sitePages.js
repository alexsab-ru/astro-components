/**
 * Чистые функции над реестром страниц (src/data/site/pages.json).
 *
 * Реестр — объект вида { "/url/": { title, enabled, sitemap, collection, always_available } }.
 * Ключ записи — сам URL в каноническом виде (ведущий и завершающий слэш, без query/якоря);
 * поля `url` в записи больше нет, чтобы не заводить два разных ключа с одним и тем же URL —
 * склейка слоёв (deepMerge) сливает записи по точному совпадению строки ключа, и такое
 * дублирование сделало бы переопределение дилера молчаливо неработающим.
 *
 * Отсутствие записи означает «маршрут включён и в sitemap»: реестр не белый список,
 * потому что контент-коллекции обнаруживаются динамически и у дилеров разные.
 *
 * Данные приходят параметром — загрузка живёт в siteRoutes.js (статический импорт)
 * и в astro.config.mjs / content-config/collections.ts (чтение через fs).
 */
import { pathMatchesRouteRules } from './pathMatchesRouteRules.js';

const isPlainObject = (value) =>
	value !== null && typeof value === 'object' && !Array.isArray(value);

const COLLECTION_NAME_RE = /^[a-z0-9][a-z0-9_-]*$/;

/** Приводит URL к каноничному виду `/path/`: без хвоста запроса и якоря, со слэшами по краям. */
export function normalizePageUrl(url) {
	if (typeof url !== 'string' || url === '') return '';
	const withoutTail = url.split('#')[0].split('?')[0];
	if (withoutTail === '') return '';
	const withLead = withoutTail.startsWith('/') ? withoutTail : `/${withoutTail}`;
	return withLead.endsWith('/') ? withLead : `${withLead}/`;
}

/** Записи реестра в виде массива. url — нормализованный ключ записи. Записи, значение которых не объект, отбрасываются. */
export function listPages(pages = {}) {
	if (!isPlainObject(pages)) return [];
	return Object.entries(pages)
		.filter(([, entry]) => isPlainObject(entry))
		.map(([key, entry]) => ({ ...entry, url: normalizePageUrl(key) }));
}

/** URL страниц, которые не должны собираться. Заменяет routes.disabled_routes. */
export function getDisabledUrls(pages = {}) {
	return listPages(pages)
		.filter((page) => page.enabled === false)
		.map((page) => page.url);
}

/** URL страниц, которые собираются, но исключены из sitemap. Заменяет routes.sitemap_ignore. */
export function getSitemapIgnoredUrls(pages = {}) {
	return listPages(pages)
		.filter((page) => page.enabled !== false && page.sitemap === false)
		.map((page) => page.url);
}

/** Имена коллекций, чей индекс доступен без контента. Заменяет routes.always_available_collections. */
export function getAlwaysAvailableCollections(pages = {}) {
	return listPages(pages)
		.filter((page) => page.always_available === true && typeof page.collection === 'string')
		.map((page) => page.collection.trim())
		.filter((name) => COLLECTION_NAME_RE.test(name));
}

export function findPageByUrl(pages = {}, url) {
	const target = normalizePageUrl(url);
	if (!target) return undefined;
	return listPages(pages).find((page) => normalizePageUrl(page.url) === target);
}

export function getPageTitle(pages = {}, url) {
	return findPageByUrl(pages, url)?.title;
}

/** Выключен ли URL. Правило со слэшем на конце гасит всё поддерево — как раньше в disabled_routes. */
export function isUrlDisabled(pages = {}, url) {
	const target = normalizePageUrl(url);
	if (!target) return false;
	return pathMatchesRouteRules(target, getDisabledUrls(pages));
}
