/**
 * Настройки маршрутов из src/data/site/pages.json (приходит из astro-json).
 *
 * Зачем этот модуль, если есть хук strip-disabled в astro.config?
 * - При `astro build` фронтматтер каждой страницы тоже выполняется: здесь мы режем getStaticPaths
 *   и делаем ранний Astro.redirect — это основной способ «не отдавать» раздел.
 * - В `astro dev` хука финальной сборки нет — логику «не отдавать» дублирует middleware (rewrite на /404) и сами страницы.
 * - Хук после сборки дополнительно удаляет каталоги из dist (подстраховка и единый контракт).
 *
 * Чистые функции над реестром — в ./sitePages.js, сопоставление путей — в ./pathMatchesRouteRules.js.
 *
 * Как отключить любой раздел: в astro-json поставить записи "enabled": false, например
 * { "trade-in": { "enabled": false } }. URL со слэшем на конце гасит всё дерево (/models/foo/ тоже).
 *
 * Кастомная 404: в .astro вместо `new Response` используйте `return Astro.rewrite(SITE_NOT_FOUND_PATH)` —
 * тогда отрисуется src/pages/404.astro, URL в адресной строке не сменится.
 */
import pages from '../../data/site/pages.json';
import { pathMatchesRouteRules } from './pathMatchesRouteRules.js';
import { getDisabledUrls, isUrlDisabled } from './sitePages.js';

/** Путь к странице 404.astro; для `return Astro.rewrite(SITE_NOT_FOUND_PATH)` в frontmatter. */
export const SITE_NOT_FOUND_PATH = '/404';

/** Реестр страниц текущего сайта. */
export function getSitePages() {
	return pages;
}

/** Сырой список выключенных URL (нужен middleware и для отладки). */
export function getDisabledRoutes() {
	return getDisabledUrls(pages);
}

export { pathMatchesRouteRules };

/**
 * Удобная обёртка: отключён ли URL в рамках текущего сайта.
 * Пример: isRouteDisabled('/models/'), isRouteDisabled('/trade-in/')
 */
export function isRouteDisabled(pathname) {
	return isUrlDisabled(pages, pathname);
}
