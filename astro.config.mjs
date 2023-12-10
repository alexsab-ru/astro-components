import {defineConfig} from 'astro/config';
import tailwind from '@astrojs/tailwind';
import alpinejs from '@astrojs/alpinejs';

import sitemap from "@astrojs/sitemap";
import robots from "astro-robots";

// https://astro.build/config
export default defineConfig({
	site: 'https://site.com',
	integrations: [
		tailwind(), 
		sitemap(),
		robots(),
		alpinejs()
	],
});
