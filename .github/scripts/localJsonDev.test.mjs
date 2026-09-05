import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dev } from 'astro';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('Astro dev updates MDX routes, external page, JSON and Tailwind; discovers an initially empty collection', { timeout: 90000 }, async () => {
	const previousCwd = process.cwd();
	const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'local-json-dev-')));
	const root = path.join(base, 'project');
	const jsonRoot = path.join(base, 'custom-source');
	const site = path.join(jsonRoot, 'src/fixture.test');
	const commonOffer = path.join(jsonRoot, 'data/content/special-offers/offer.mdx');
	const offer = path.join(site, 'content/special-offers/offer.mdx');
	const write = (file, text) => {
		fs.mkdirSync(path.dirname(file), { recursive: true });
		fs.writeFileSync(file, text);
	};
	const mdx = (title) => `---\ntitle: ${title}\n---\n# ${title}\n`;
	let server;
	try {
		write(path.join(root, 'package.json'), '{"type":"module"}');
		fs.symlinkSync(path.join(repo, 'node_modules'), path.join(root, 'node_modules'));
		write(path.join(root, '.env'), `DOMAIN=fixture.test # test\nASTRO_JSON_LOCAL_PATH=${jsonRoot}\n`);
		write(path.join(site, 'settings.json'), '{}');
		write(path.join(site, 'banners.json'), '{"title":"BannerInitial"}');
		const page = (width) => `---\nimport ${JSON.stringify(path.join(root, 'src/scss/app.css'))};\nimport banners from ${JSON.stringify(path.join(root, 'src/data/site/banners.json'))};\n---\n<h1 class="w-[${width}px] fixture-scoped">Page${width} {banners.title}</h1>\n<style>.fixture-scoped { color: rgb(12, 34, 56); }</style>`;
		write(path.join(site, 'pages/index.astro'), page(137));
		write(path.join(root, 'src/scss/app.css'), '@import "tailwindcss";\n@source "./.json-site/**/*.{json,mdx,astro}";');
		// Exercise the project's real collection definitions, including empty collections.
		for (const file of ['content.config.ts', 'content-config/collections.ts', 'content-config/fs.ts', 'content-config/schemas.ts', 'js/utils/sitePages.js', 'js/utils/pathMatchesRouteRules.js']) {
			write(path.join(root, 'src', file), fs.readFileSync(path.join(repo, 'src', file), 'utf8'));
		}
		write(path.join(root, 'src/pages/special-offers/[slug].astro'), `---
import { getCollection, render } from 'astro:content';
export async function getStaticPaths() {
 const entries = await getCollection('special-offers');
 return entries.map(entry => ({params: {slug: entry.id}, props: {entry}}));
}
const { Content } = await render(Astro.props.entry);
---
<Content />`);
		write(path.join(root, 'astro.config.mjs'), `import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import localJsonDev from ${JSON.stringify(path.join(repo, '.github/scripts/localJsonDev.mjs'))};
export default defineConfig({ cacheDir: './.cache', integrations: [mdx()], vite: { cacheDir: './.vite', plugins: [tailwindcss(), localJsonDev()] }, devToolbar: {enabled: false} });`);
		const env = { ...process.env };
		delete env.DOMAIN;
		delete env.ASTRO_JSON_LOCAL_PATH;
		execFileSync(process.execPath, [path.join(repo, '.github/scripts/linkAstroJson.mjs')], { cwd: root, env });
		process.chdir(root);
		server = await dev({ root, server: { host: '127.0.0.1', port: 0, open: false }, logLevel: 'error' });
		const origin = `http://127.0.0.1:${server.address.port}`;
		async function expectResponse(url, status, text) {
			let last = '';
			for (let i = 0; i < 100; i++) {
				try {
					const response = await fetch(origin + url, { signal: AbortSignal.timeout(2000) });
					last = await response.text();
					if (response.status === status && (!text || last.includes(text))) return last;
				} catch (error) { last = error.message; }
				await sleep(200);
			}
			assert.fail(`${url} did not reach ${status} ${text ?? ''}: ${last.slice(0, 500)}`);
		}
		const initialPage = await expectResponse('/', 200, 'BannerInitial');
		assert.match(initialPage, /rgb\(12,\s*34,\s*56\)/, 'The external page must propagate its scoped CSS');
		await expectResponse('/src/scss/app.css?direct', 200, 'width: 137px');
		write(commonOffer, mdx('CommonOffer'));
		write(offer, mdx('SiteOffer'));
		await expectResponse('/special-offers/offer/', 200, 'SiteOffer');
		write(offer, mdx('SiteUpdated'));
		await expectResponse('/special-offers/offer/', 200, 'SiteUpdated');
		const added = path.join(site, 'content/special-offers/new.mdx');
		write(added, mdx('NewOffer'));
		await expectResponse('/special-offers/new/', 200, 'NewOffer');
		const renamed = path.join(site, 'content/special-offers/renamed.mdx');
		fs.renameSync(added, renamed);
		await expectResponse('/special-offers/renamed/', 200, 'NewOffer');
		await expectResponse('/special-offers/new/', 404);
		fs.unlinkSync(offer);
		await expectResponse('/special-offers/offer/', 200, 'CommonOffer');
		write(path.join(site, 'pages/index.astro'), page(139));
		await expectResponse('/', 200, 'Page139');
		await expectResponse('/src/scss/app.css?direct', 200, 'width: 139px');
		write(path.join(site, 'banners.json'), '{"title":"BannerUpdated"}');
		await expectResponse('/', 200, 'BannerUpdated');
		fs.unlinkSync(renamed);
		fs.unlinkSync(commonOffer);
		await expectResponse('/special-offers/offer/', 404);
		// Give the collection-removal restart time to finish before testing first add.
		await sleep(1000);
		write(offer, mdx('FirstOffer'));
		await expectResponse('/special-offers/offer/', 200, 'FirstOffer');
	} finally {
		await server?.stop();
		process.chdir(previousCwd);
		fs.rmSync(base, { recursive: true, force: true });
	}
});
