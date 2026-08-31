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
import { spawn } from 'node:child_process';
import { pathMatchesRouteRules } from './src/js/utils/pathMatchesRouteRules.js';
import { getDisabledUrls, getSitemapIgnoredUrls } from './src/js/utils/sitePages.js';
import { resolveDevHost } from './src/js/utils/devHost.js';

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

// Единый источник домена: приоритетно src/data/site/scripts.json, затем .env DOMAIN.
// Используется и для site:, и для dev-хоста — чтобы они не могли разойтись.
const readRawDomain = () => {
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
    return scriptsSiteFromJson || ((env.DOMAIN ?? process.env.DOMAIN ?? '').toString().trim());
};

const resolveSiteFromConfig = (fallbackUrl) => {
    const rawDomain = readRawDomain();

    // Нормализуем до https://<domain>. Также переводим http:// -> https://.
    if (!rawDomain) return fallbackUrl;
    if (rawDomain.startsWith('https://')) return rawDomain;
    if (rawDomain.startsWith('http://')) return rawDomain.replace(/^http:\/\//, 'https://');
    return `https://${rawDomain}`;
};

const computedSite = resolveSiteFromConfig('https://example.com');

// --- dev-сервер ---
// Каждый дилерский сайт получает свой origin вида <DOMAIN>.localhost, иначе кэш,
// localStorage и куки протекают между сайтами (см. spec 2026-08-06-dev-host-per-domain).
// ASTRO_DEV_OPEN=0 отключает автооткрытие браузера (нужно для test_links_local).
const devHost = resolveDevHost(readRawDomain());
const devOpenEnabled = (env.ASTRO_DEV_OPEN ?? process.env.ASTRO_DEV_OPEN ?? '1') !== '0';

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

// Сопоставление путей: disabled / sitemap_ignore — см. src/js/utils/pathMatchesRouteRules.js

// --- pages.json: что собирается и что попадает в sitemap ---
// Формат: { "<id>": { url, title, enabled, sitemap, collection, always_available } }
// Отсутствие файла — не ошибка: реестр пуст, значит ничего не выключено.
const loadSitePagesFromData = () => {
	const pagesJsonPath = path.resolve(process.cwd(), 'src/data/site/pages.json');
	try {
		const raw = JSON.parse(fs.readFileSync(pagesJsonPath, 'utf-8'));
		return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
	} catch {
		return {};
	}
};

// --- routes.json: только редиректы ---
// Формат: { "redirects": { "/from": "/to" | { status, destination } } }
// Резерв: если routes.json нет, читаем legacy redirects.json как объект редиректов.
const loadRedirectsFromData = () => {
	const routesJsonPath = path.resolve(process.cwd(), 'src/data/site/routes.json');
	const legacyRedirectsPath = path.resolve(process.cwd(), 'src/data/site/redirects.json');
	try {
		const raw = JSON.parse(fs.readFileSync(routesJsonPath, 'utf-8'));
		return raw.redirects && typeof raw.redirects === 'object' && !Array.isArray(raw.redirects)
			? raw.redirects
			: {};
	} catch {
		try {
			const raw = JSON.parse(fs.readFileSync(legacyRedirectsPath, 'utf-8'));
			return typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? raw : {};
		} catch {
			return {};
		}
	}
};

// Ссылка с явной схемой (http:, https:, tel:, mailto:, ...) — внешний адрес,
// а не маршрут шаблона, проверять его на "выключенную страницу" бессмысленно.
const hasUrlScheme = (value) => typeof value === 'string' && /^[a-z][a-z0-9+.-]*:/i.test(value);

// pages.json и routes.json — разные файлы: редирект может вести на страницу,
// которую реестр pages.json выключил, и без явной проверки это расхождение
// не заметно до первого 404 в проде (см. пункт про personal-data-consent).
const warnIfRedirectTargetsDisabledPage = (from, destination, disabledRoutes) => {
	if (hasUrlScheme(destination)) return;
	if (pathMatchesRouteRules(destination, disabledRoutes)) {
		console.warn(`[astro.config] routes.json redirects: "${from}" ведёт на "${destination}" — эта страница выключена в pages.json.`);
	}
};

const validateRedirectEntries = (raw, disabledRoutes) => {
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
			warnIfRedirectTargetsDisabledPage(from, to, disabledRoutes);
		} else if (typeof to === 'object' && to !== null && typeof to.destination === 'string') {
			const status = Number(to.status);
			if (status && [301, 302, 303, 307, 308].includes(status)) {
				validated[from] = { status, destination: to.destination };
				warnIfRedirectTargetsDisabledPage(from, to.destination, disabledRoutes);
			} else {
				console.warn(`[astro.config] routes.json: пропущен "${from}" — недопустимый status ${to.status}. Допустимы: 301, 302, 303, 307, 308.`);
			}
		} else {
			console.warn(`[astro.config] routes.json: пропущен "${from}" — значение должно быть строкой или объектом с destination.`);
		}
	}
	return validated;
};

const sitePages = loadSitePagesFromData();
const disabledRoutesForBuild = getDisabledUrls(sitePages);
const sitemapIgnoreRoutes = getSitemapIgnoredUrls(sitePages);
const redirectsConfig = validateRedirectEntries(loadRedirectsFromData(), disabledRoutesForBuild);
// Открывает браузер на origin текущего дилера.
//
// Почему не server.open: это статическая строка, вычисляемая до listen(), а Vite при
// занятом порте делает httpServer.listen(++port, host). Открытие идёт через
// `new URL(options.open, url).href`, где абсолютный URL игнорирует базу с реальным
// портом. Второй инстанс сел бы на :4322, а вкладку открыл на :4321 — то есть на
// чужом уже запущенном сайте. Хук astro:server:start отдаёт фактический address.port.
const devHostOpenIntegration = (host) => ({
	name: 'dev-host-open',
	hooks: {
		'astro:server:start': ({ address, logger }) => {
			const url = `http://${host}:${address.port}/`;
			logger.info(`Открываю ${url}`);

			const isWin = process.platform === 'win32';
			const cmd = process.platform === 'darwin' ? 'open' : isWin ? 'cmd' : 'xdg-open';
			// На Windows первый аргумент start — заголовок окна, поэтому пустая строка.
			const args = isWin ? ['/c', 'start', '', url] : [url];

			try {
				spawn(cmd, args, { stdio: 'ignore', detached: true }).unref();
			} catch (e) {
				logger.warn(`Не удалось открыть браузер: ${e}`);
			}
		},
	},
});

const isDevCommand = process.argv.includes('dev');
const devToolbarIntegrations = isDevCommand
	? [
		(await import('./dev-toolbar/domain-switch/integration.ts')).default(),
		...(devOpenEnabled ? [devHostOpenIntegration(devHost)] : []),
	]
	: [];

// Удаляет из dist папки целых разделов (например catalog), если соответствующий путь выключен в pages.json.
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
		...devToolbarIntegrations,
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
	// port и open не задаём: порт остаётся астровским 4321 с автоинкрементом,
	// открытие браузера делает интеграция dev-host-open с фактическим портом.
	server: {
		host: true,
	},
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
		environments: {
			client: {
			  build: {
				rollupOptions: {
				  output: {
					// path names relative to `outDir`
					entryFileNames: 'js/e.[hash].js', // js/[name].[hash:8].js
					chunkFileNames: 'js/c.[hash].js', //js/chunks/[name].[hash:8].js
					assetFileNames: 'static/[hash][extname]', // static/[name].[hash:8][extname]
				  },
				},
			  },
			},
		},
	},
	redirects: redirectsConfig,
	site: computedSite,
	base: "/"
});
