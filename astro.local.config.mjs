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

// https://astro.build/config
//
// Определяем значение site из src/data/scripts.json.
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
    // Читаем ./src/data/scripts.json из корня проекта.
    const scriptsJsonPath = path.resolve(process.cwd(), 'src/data/scripts.json');
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

const computedSite = resolveSiteFromConfig('https://alexsab-ru.github.io');
export default defineConfig({
	integrations: [
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
    site: computedSite,
	base: '/'
});