import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";
import alpinejs from "@astrojs/alpinejs";
import sitemap from "@astrojs/sitemap";
import robots from "astro-robots";
import mdx from "@astrojs/mdx";
import icon from "astro-icon";
import yaml from '@rollup/plugin-yaml';
import react from '@astrojs/react';
import { loadEnv } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import domainSwitchToolbar from "./dev-toolbar/domain-switch/integration";
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

const computedSite = resolveSiteFromConfig('https://alexsab-ru.github.io');

// --- dev-сервер ---
// Каждый дилерский сайт получает свой origin вида <DOMAIN>.localhost, иначе кэш,
// localStorage и куки протекают между сайтами (см. spec 2026-08-06-dev-host-per-domain).
// ASTRO_DEV_OPEN=0 отключает автооткрытие браузера (нужно для test_links_local).
const devHost = resolveDevHost(readRawDomain());
const devOpenEnabled = (env.ASTRO_DEV_OPEN ?? process.env.ASTRO_DEV_OPEN ?? '1') !== '0';

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

export default defineConfig({
	integrations: [
		domainSwitchToolbar(),
		...(devOpenEnabled ? [devHostOpenIntegration(devHost)] : []),
		sitemap(),
		robots({
			policy: [
				{
					userAgent: ["*"],
					allow: ["/"],
					disallow: ["/?*"],
				},
			  ],
		}),
		alpinejs(),
		mdx(),
		icon(),
		react(),
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
	// port и open не задаём: порт остаётся астровским 4321 с автоинкрементом,
	// открытие браузера делает интеграция dev-host-open с фактическим портом.
	server: {
		host: true,
	},
    site: computedSite,
	base: '/'
});