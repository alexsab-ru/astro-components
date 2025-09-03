import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import alpinejs from '@astrojs/alpinejs';
import sitemap from "@astrojs/sitemap";
import robots from "astro-robots";
import mdx from "@astrojs/mdx";
import icon from "astro-icon";
import yaml from '@rollup/plugin-yaml';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
	integrations: [
		tailwind({
			configFile: './tailwind.geely.js'
		}),
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
		plugins: [yaml()],
		css: {
			preprocessorOptions: {
			  	scss: {
					silenceDeprecations: ['legacy-js-api'],
				},
			},
		},
	},
	site: 'https://geely.alexsab.ru',
	base: "/"
});
