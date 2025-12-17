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

const computedSite = resolveSiteFromConfig('https://example.com');
export default defineConfig({
	integrations: [
		sitemap({
			filter: (page) => !page.endsWith('telegram-bot/') && !page.endsWith('redirect/')
		}),
		robots({
			policy: [
				{
					userAgent: "Yandex",
					allow: ["/"],
					disallow: ["/?*"],
					cleanParam: [
						"_ym_debug&_ym_lang&_ym_status-check&yadclid&yadordid&yandex_ad_client_id&yandex-source&yclid&yhid&ymclid&yhic&ychyd&ycilyd&ycylid&ypppel&yqppel", 
						"_ga&_gac&ga&gclid&gcmes&gcmlg&utm_sourcegoogle", 
						"utm_&utm_bn_id&utm_bn_system_id&utm_branch&utm_c&utm_campai&utm_campaign&utm_content&utm_from&utm_hclid&utm_me&utm_mediu&utm_medium&utm_orderpage&utm_partner_id&utm_placement&utm_position&utm_redirect&utm_referer&utm_referrer&utm_source&utm_startpage&utm_term&utm_type&_openstat&_source_stat_&gtm_debug", 
						"adid&admitad_uid&adrclid&adv&aid&baobab_event_id&bxajaxid&calltouch_tm&clid&dclid&erid&etext&fbclid&from&frommarket&height&int_campaign&lang&length&mindbox&mindbox_nocache&mindbox-click-id&mindbox-message-key&mobileApp&msclkid&msisdn&mt_click_id&noredirect&openstat&order&ORDER_BY", 
						"pay&payment&q&s&rb_clickid&ref&referrer&roistat_visit&sa&set_filter&source&tag&tags&target&text&token&twclid&type&types&userDataToken&USERID&uuid&ved&vendor&wbraid&width&action&register&cid&k50id&search&cm_id&ivid&hl&tpclid", 
						"region&region_name&utm_ya_campaign&utm_candidate&block&model&color&drive&complects&editionuid"
					],
				},
				{
					userAgent: "Googlebot",
					allow: ["/"],
					disallow: ["/?*"],
				},
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
	base: "/"
});
