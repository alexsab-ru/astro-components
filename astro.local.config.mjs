import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import alpinejs from "@astrojs/alpinejs";
import sitemap from "@astrojs/sitemap";
import robots from "astro-robots";
import mdx from "@astrojs/mdx";

// https://astro.build/config
export default defineConfig({
	integrations: [
		tailwind({
			configFile: './tailwind.config.js'
		}),
		sitemap(),
		robots(),
		alpinejs(),
		mdx()
	],
	// site: 'https://alexsab-ru.github.io',
	// base: 'astro-website'
});