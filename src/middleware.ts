import { defineMiddleware } from 'astro:middleware';
import {
	SITE_NOT_FOUND_PATH,
	getDisabledRoutes,
	pathMatchesRouteRules,
} from './js/utils/siteRoutes.js';

/**
 * В dev (и в SSR/preview) отдаём настоящий 404.astro, если путь в disabled_routes.
 * Статика на «голом» nginx без Node middleware сюда не доходит — там срабатывают проверки в страницах + strip в astro.config.
 */
export const onRequest = defineMiddleware(async (context, next) => {
	const pathname = context.url.pathname;
	if (pathname === SITE_NOT_FOUND_PATH || pathname === '/404/') {
		return next();
	}
	if (pathMatchesRouteRules(pathname, getDisabledRoutes())) {
		return context.rewrite(new URL(SITE_NOT_FOUND_PATH, context.url));
	}
	return next();
});
