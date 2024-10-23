import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import alpinejs from "@astrojs/alpinejs";
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
			configFile: './tailwind.belgee.js'
		}),
		sitemap(),
		robots(),
		alpinejs(),
		mdx(),
		icon(),
		react(),
	],
	vite: {
		plugins: [yaml()]
	},
	// site: 'https://alexsab-ru.github.io',
	// base: 'astro-website'
});