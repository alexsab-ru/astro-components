/**
 * Слоты меню (src/data/site/menu.json) и их разрешение против реестра страниц.
 *
 * Формат: { header: [...], main: [...], footer: [...], footer_legal: [...] }.
 * Значение слота — массив, а deepMerge заменяет массивы целиком: дилер,
 * меняющий один пункт, переопределяет весь слот. Для упорядоченного списка
 * это осознанное поведение.
 *
 * Слот footer не задан — берётся main: сегодня футер рендерит тот же список,
 * что и панель под хедером, и фолбэк сохраняет это без записи у 86 дилеров.
 */
import { pathMatchesRouteRules } from './pathMatchesRouteRules.js';
import { getDisabledUrls, getPageTitle, normalizePageUrl } from './sitePages.js';

export const MENU_SLOTS = ['header', 'main', 'footer', 'footer_legal'];

/** Ссылка с явной схемой (http:, tel:, mailto:, tg:) — не наш маршрут. */
const hasScheme = (url) => /^[a-z][a-z0-9+.-]*:/i.test(url);

/**
 * `javascript:` — псевдо-ссылка (обычно раскрывающийся заголовок меню вроде
 * «Покупателям»/«Владельцам»), а не переход. В любом слоте это мёртвая ссылка,
 * поэтому такие пункты отбрасываются целиком, а не просто пропускаются
 * проверкой выключенных страниц.
 */
const isJavascriptUrl = (url) => typeof url === 'string' && /^javascript:/i.test(url.trim());

/**
 * Путь пункта для проверки «выключена ли страница».
 * Пустая строка означает «проверять нечего, пункт оставляем всегда»:
 * внешние ссылки и якоря на текущей странице (`/#services`) фильтровать нельзя.
 */
export function menuItemPath(url) {
	if (typeof url !== 'string' || url === '') return '';
	if (hasScheme(url)) return '';
	const beforeHash = url.split('#')[0];
	if (beforeHash === '' || beforeHash === '/') return '';
	return normalizePageUrl(beforeHash);
}

/** Сырые пункты слота. Для footer — фолбэк на main. */
export function getSlotItems(menu = {}, slot) {
	const raw = menu?.[slot];
	if (Array.isArray(raw)) return raw;
	if (slot === 'footer' && Array.isArray(menu?.main)) return menu.main;
	return [];
}

/**
 * Пункты слота, готовые к рендеру: без ведущих на выключенные страницы,
 * с подписью в поле `name` (его читают HeaderMenuLink.astro и FooterV2.astro).
 */
export function resolveMenu(menu = {}, pages = {}, slot) {
	const disabled = getDisabledUrls(pages);
	return getSlotItems(menu, slot)
		.filter((item) => {
			if (isJavascriptUrl(item?.url)) return false;
			const target = menuItemPath(item?.url);
			return target === '' ? true : !pathMatchesRouteRules(target, disabled);
		})
		.map((item) => {
			const path = menuItemPath(item?.url);
			return {
				...item,
				name: item?.title ?? item?.name ?? (path ? getPageTitle(pages, path) : '') ?? '',
			};
		});
}
