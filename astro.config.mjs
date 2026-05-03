import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";
import alpinejs from '@astrojs/alpinejs';
import sitemap from "@astrojs/sitemap";
import robots from "astro-robots";
import mdx from "@astrojs/mdx";
import icon from "astro-icon";
import yaml from '@rollup/plugin-yaml';
import react from '@astrojs/react';
import { loadEnv } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathMatchesRouteRules } from './src/js/utils/pathMatchesRouteRules.js';

// https://astro.build/config
//
// Определяем значение site из src/data/site/scripts.json.
// Если там нет, то берём DOMAIN из .env и добавляем https:// в начале.
// Если ни одно не задано, используем прежнее значение по умолчанию.
// Важно: в astro.config.mjs .env не загружается автоматически. Рекомендуемый способ — loadEnv из Vite.
// См. документацию: https://docs.astro.build/en/guides/environment-variables/#in-the-astro-config-file
const env = (() => {
    try {
        return loadEnv(process.env.MODE ?? process.env.NODE_ENV ?? 'development', process.cwd(), '');
    } catch (_) {
        return {};
    }
})();

const resolveSiteFromConfig = (fallbackUrl) => {
    // Читаем ./src/data/site/scripts.json из корня проекта.
    const scriptsJsonPath = path.resolve(process.cwd(), 'src/data/site/scripts.json');
    let scriptsSiteFromJson = '';
    try {
        const rawFileContent = fs.readFileSync(scriptsJsonPath, 'utf-8');
        const parsedJson = JSON.parse(rawFileContent);
        // В JSON ключ называется "site". Допускаем отсутствие.
        scriptsSiteFromJson = (parsedJson?.site ?? '').toString().trim();
    } catch (_) {
        // Файл может отсутствовать на ранних этапах. Это нормально.
    }

    // Берём приоритетно значение из JSON, затем из ENV.
    const rawDomain = scriptsSiteFromJson || ((env.DOMAIN ?? process.env.DOMAIN ?? '').toString().trim());

    // Нормализуем до https://<domain>. Также переводим http:// -> https://.
    if (!rawDomain) return fallbackUrl;
    if (rawDomain.startsWith('https://')) return rawDomain;
    if (rawDomain.startsWith('http://')) return rawDomain.replace(/^http:\/\//, 'https://');
    return `https://${rawDomain}`;
};

const computedSite = resolveSiteFromConfig('https://example.com');

// --- robots.json ---
// Читаем настройки robots из src/data/site/robots.json.
// При отсутствии файла или ошибках парсинга используем минимальный безопасный конфиг.
const resolveRobotsConfig = () => {
	const robotsJsonPath = path.resolve(process.cwd(), 'src/data/site/robots.json');
	try {
		const raw = JSON.parse(fs.readFileSync(robotsJsonPath, 'utf-8'));
		const warn = (msg) => console.warn(`[astro.config] robots.json: ${msg}`);

		// --- Валидация policy ---
		if (!Array.isArray(raw?.policy) || raw.policy.length === 0) {
			warn('policy должен быть непустым массивом. Используется конфиг по умолчанию.');
			return undefined;
		}
		for (const rule of raw.policy) {
			if (!rule.userAgent) {
				warn('каждый элемент policy должен содержать userAgent. Используется конфиг по умолчанию.');
				return undefined;
			}
			// Плагин требует хотя бы allow или disallow в каждом правиле.
			if (!rule.allow && !rule.disallow) {
				warn(`правило для "${rule.userAgent}" не содержит allow/disallow. Используется конфиг по умолчанию.`);
				return undefined;
			}
			// crawlDelay: 0.1–60 (если указан).
			if (rule.crawlDelay !== undefined) {
				const cd = Number(rule.crawlDelay);
				if (Number.isNaN(cd) || cd < 0.1 || cd > 60) {
					warn(`crawlDelay для "${rule.userAgent}" должен быть числом от 0.1 до 60. Используется конфиг по умолчанию.`);
					return undefined;
				}
			}
		}

		// --- Валидация sitemap (если указан) ---
		if (raw.sitemap !== undefined && raw.sitemap !== true && raw.sitemap !== false) {
			const sitemapUrls = Array.isArray(raw.sitemap) ? raw.sitemap : [raw.sitemap];
			const sitemapRe = /^https?:\/\/[^\s/$.\?#]\.[^\s]*\.(xml|xml\.gz|txt|txt\.gz|json|xhtml)$/i;
			for (const url of sitemapUrls) {
				if (typeof url !== 'string' || !sitemapRe.test(url)) {
					warn(`невалидный sitemap URL "${url}". Ожидается полный URL оканчивающийся на .xml/.xml.gz/.txt/.json/.xhtml.`);
					return undefined;
				}
			}
		}

		// --- Валидация host (если указан) ---
		if (raw.host !== undefined && raw.host !== null) {
			if (typeof raw.host !== 'string' || !/^[a-zA-Z0-9]([a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}$/.test(raw.host)) {
				warn(`невалидный host "${raw.host}". Ожидается доменное имя без протокола.`);
				return undefined;
			}
		}

		return raw;
	} catch (_) {
		// Файл может отсутствовать — robots будет работать без параметров.
		return undefined;
	}
};
const robotsConfig = resolveRobotsConfig();

// Сопоставление путей: disabled_routes / sitemap_ignore — см. src/js/utils/pathMatchesRouteRules.js

// --- routes.json (раньше редиректы лежали в отдельном redirects.json) ---
// Формат: { "disabled_routes": [], "sitemap_ignore": [], "redirects": { "/from": "/to" | { status, destination } } }
// Резерв: если routes.json нет, читаем legacy redirects.json как объект редиректов.
const loadSiteRoutesFromData = () => {
	const routesJsonPath = path.resolve(process.cwd(), 'src/data/site/routes.json');
	const legacyRedirectsPath = path.resolve(process.cwd(), 'src/data/site/redirects.json');
	const empty = { disabled_routes: [], sitemap_ignore: [], redirects: {} };
	try {
		const raw = JSON.parse(fs.readFileSync(routesJsonPath, 'utf-8'));
		return {
			disabled_routes: Array.isArray(raw.disabled_routes) ? raw.disabled_routes : [],
			sitemap_ignore: Array.isArray(raw.sitemap_ignore) ? raw.sitemap_ignore : [],
			redirects:
				raw.redirects && typeof raw.redirects === 'object' && !Array.isArray(raw.redirects) ? raw.redirects : {},
		};
	} catch {
		try {
			const raw = JSON.parse(fs.readFileSync(legacyRedirectsPath, 'utf-8'));
			return {
				...empty,
				redirects: typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? raw : {},
			};
		} catch {
			return empty;
		}
	}
};

const validateRedirectEntries = (raw) => {
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		console.warn('[astro.config] routes.json: ключ "redirects" должен быть объектом. Редиректы отключены.');
		return {};
	}
	const validated = {};
	for (const [from, to] of Object.entries(raw)) {
		if (typeof from !== 'string' || !from.startsWith('/')) {
			console.warn(`[astro.config] routes.json redirects: пропущен ключ "${from}" — должен начинаться с "/".`);
			continue;
		}
		if (typeof to === 'string') {
			validated[from] = to;
		} else if (typeof to === 'object' && to !== null && typeof to.destination === 'string') {
			const status = Number(to.status);
			if (status && [301, 302, 303, 307, 308].includes(status)) {
				validated[from] = { status, destination: to.destination };
			} else {
				console.warn(`[astro.config] routes.json: пропущен "${from}" — недопустимый status ${to.status}. Допустимы: 301, 302, 303, 307, 308.`);
			}
		} else {
			console.warn(`[astro.config] routes.json: пропущен "${from}" — значение должно быть строкой или объектом с destination.`);
		}
	}
	return validated;
};

const siteRoutes = loadSiteRoutesFromData();
const redirectsConfig = validateRedirectEntries(siteRoutes.redirects);
const disabledRoutesForBuild = siteRoutes.disabled_routes;
const sitemapIgnoreRoutes = siteRoutes.sitemap_ignore;

// Удаляет из dist папки целых разделов (например catalog), если соответствующий путь в disabled_routes.
// Дублирует логику «не собирать» для статических index.astro без getStaticPaths.
const stripDisabledRoutesIntegration = (disabledRules) => ({
	name: 'strip-disabled-route-dirs',
	hooks: {
		'astro:build:done': ({ dir }) => {
			if (!disabledRules.length) return;
			const outDir = dir instanceof URL ? fileURLToPath(dir) : String(dir);
			for (const rule of disabledRules) {
				const seg = String(rule).replace(/^\/+/u, '').replace(/\/+$/u, '');
				if (!seg) continue;
				const target = path.join(outDir, seg);
				try {
					if (fs.existsSync(target)) {
						fs.rmSync(target, { recursive: true, force: true });
						console.log(`[strip-disabled-route-dirs] удалено: ${target}`);
					}
				} catch (e) {
					console.warn(`[strip-disabled-route-dirs] не удалось удалить ${target}:`, e);
				}
			}
		},
	},
});

export default defineConfig({
	integrations: [
		sitemap({
			filter: (page) => {
				let pathname = '';
				try {
					pathname = new URL(page).pathname;
				} catch {
					pathname = page.startsWith('/') ? page : `/${page}`;
				}
				// Полное отключение и отдельное исключение только из карты сайта
				if (pathMatchesRouteRules(pathname, disabledRoutesForBuild)) return false;
				if (pathMatchesRouteRules(pathname, sitemapIgnoreRoutes)) return false;
				return (
					!page.endsWith('telegram-bot/') &&
					!page.endsWith('max-bot/') &&
					!page.endsWith('redirect/') &&
					!page.includes('/model-page/') &&
					!page.includes('/chat/')
				);
			},
		}),
		robots(robotsConfig ?? {}),
		alpinejs(),
		mdx(),
		icon(),
		react(),
		stripDisabledRoutesIntegration(disabledRoutesForBuild),
	],
	vite: {
		plugins: [
			yaml(),
			tailwindcss(),
		],
		css: {
			preprocessorOptions: {
			  	scss: {
					silenceDeprecations: ['legacy-js-api'],
				},
			},
		},
	},
	redirects: redirectsConfig,
	site: computedSite,
	base: "/"
});
