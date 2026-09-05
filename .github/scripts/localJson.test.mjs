import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createOffersSync, detachJsonSource, linkedJsonSource, resolveJsonSource, sourceLink } from './localJson.mjs';
import localJsonDev from './localJsonDev.mjs';

const script = fileURLToPath(new URL('./linkAstroJson.mjs', import.meta.url));
function fixture(t) {
	const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'local-json-test-')));
	t.after(() => fs.rmSync(base, { recursive: true, force: true }));
	const root = path.join(base, 'project');
	const jsonRoot = path.join(base, 'custom source');
	const siteDir = path.join(jsonRoot, 'src/fixture.test');
	const write = (file, contents) => {
		fs.mkdirSync(path.dirname(file), { recursive: true });
		fs.writeFileSync(file, typeof contents === 'string' ? contents : JSON.stringify(contents));
	};
	write(path.join(root, '.env'), `DOMAIN="fixture.test" # active site\nASTRO_JSON_LOCAL_PATH="${jsonRoot}"\n`);
	write(path.join(siteDir, 'settings.json'), { brand: 'Belgee, Jetour' });
	const dest = path.join(root, 'src/content/special-offers');
	const common = path.join(jsonRoot, 'data/content/special-offers');
	const brand = path.join(jsonRoot, 'src/belgee.alexsab.ru/content/special-offers');
	const brand2 = path.join(jsonRoot, 'src/jetour.alexsab.ru/content/special-offers');
	const site = path.join(siteDir, 'content/special-offers');
	const sync = createOffersSync(root, { jsonRoot, siteDir });
	return { root, jsonRoot, siteDir, write, dest, common, brand, brand2, site, sync };
}

test('source parsing supports comments, quotes, custom paths and environment precedence', (t) => {
	const f = fixture(t);
	assert.deepEqual(resolveJsonSource(f.root, undefined, {}), { jsonRoot: f.jsonRoot, siteDir: f.siteDir });
	assert.deepEqual(resolveJsonSource(f.root, f.jsonRoot, { ASTRO_JSON_LOCAL_PATH: '/does-not-exist' }).siteDir, f.siteDir);
	assert.throws(() => resolveJsonSource(f.root, undefined, { DOMAIN: '../outside' }), /DOMAIN/);
	assert.throws(() => resolveJsonSource(f.root, undefined, { DOMAIN: 'a\\b' }), /DOMAIN/);
});

test('add, rename, delete and fallback preserve common → brands → site', (t) => {
	const f = fixture(t);
	const read = (name) => fs.readFileSync(path.join(f.dest, name), 'utf8');
	f.write(path.join(f.common, 'offer.mdx'), 'common');
	f.write(path.join(f.brand, 'offer.mdx'), 'brand');
	f.write(path.join(f.site, 'offer.mdx'), 'site');
	f.sync.sync();
	assert.equal(read('offer.mdx'), 'site');
	const mtime = fs.statSync(path.join(f.dest, 'offer.mdx')).mtimeMs;
	f.sync.sync();
	assert.equal(fs.statSync(path.join(f.dest, 'offer.mdx')).mtimeMs, mtime);
	fs.unlinkSync(path.join(f.site, 'offer.mdx'));
	f.sync.sync();
	assert.equal(read('offer.mdx'), 'brand');
	fs.unlinkSync(path.join(f.brand, 'offer.mdx'));
	f.sync.sync();
	assert.equal(read('offer.mdx'), 'common');
	f.write(path.join(f.site, 'nested/new.mdx'), 'new');
	f.sync.sync();
	assert.equal(read('nested/new.mdx'), 'new');
	fs.renameSync(path.join(f.site, 'nested/new.mdx'), path.join(f.site, 'renamed.mdx'));
	f.sync.sync();
	assert.equal(read('renamed.mdx'), 'new');
	assert.equal(fs.existsSync(path.join(f.dest, 'nested/new.mdx')), false);
	fs.unlinkSync(path.join(f.common, 'offer.mdx'));
	f.sync.sync();
	assert.equal(fs.existsSync(path.join(f.dest, 'offer.mdx')), false);
});

test('brand conflicts use existing from/only rules and fail before writes', (t) => {
	const f = fixture(t);
	f.write(path.join(f.brand, '1_trade-in.mdx'), 'belgee');
	f.write(path.join(f.brand2, '1_trade-in.mdx'), 'jetour');
	f.write(path.join(f.dest, 'untouched.mdx'), 'keep');
	assert.throws(() => f.sync.sync(), /Столкновение/);
	assert.equal(fs.readFileSync(path.join(f.dest, 'untouched.mdx'), 'utf8'), 'keep');
	const registry = path.join(f.root, 'src/data/site/pages.json');
	f.write(registry, { '/special-offers/': { entries: { '1_trade-in': { from: 'belgee' } } } });
	f.sync.sync();
	assert.equal(fs.readFileSync(path.join(f.dest, '1_trade-in.mdx'), 'utf8'), 'belgee');
	assert.equal(fs.readFileSync(path.join(f.dest, '1_jetour-trade-in.mdx'), 'utf8'), 'jetour');
	f.write(registry, { '/special-offers/': { entries: { '1_trade-in': { only: 'jetour' } } } });
	f.sync.sync();
	assert.equal(fs.readFileSync(path.join(f.dest, '1_trade-in.mdx'), 'utf8'), 'jetour');
	assert.equal(fs.existsSync(path.join(f.dest, '1_jetour-trade-in.mdx')), false);
});

test('legacy file links become copies; broken links disappear; sources are not changed', (t) => {
	const f = fixture(t);
	f.write(path.join(f.site, 'offer.mdx'), 'source');
	fs.mkdirSync(f.dest, { recursive: true });
	fs.symlinkSync(path.join(f.site, 'offer.mdx'), path.join(f.dest, 'offer.mdx'));
	fs.symlinkSync(path.join(f.site, 'deleted.mdx'), path.join(f.dest, 'deleted.mdx'));
	f.sync.sync();
	assert.equal(fs.lstatSync(path.join(f.dest, 'offer.mdx')).isSymbolicLink(), false);
	assert.equal(fs.lstatSync(path.join(f.dest, 'deleted.mdx'), { throwIfNoEntry: false }), undefined);
	f.write(path.join(f.dest, 'offer.mdx'), 'local');
	assert.equal(fs.readFileSync(path.join(f.site, 'offer.mdx'), 'utf8'), 'source');
});

test('legacy directory links are detached without deleting their targets', (t) => {
	const f = fixture(t);
	f.write(path.join(f.site, 'offer.mdx'), 'source');
	fs.mkdirSync(path.dirname(f.dest), { recursive: true });
	fs.symlinkSync(f.site, f.dest);
	f.sync.sync();
	assert.equal(fs.lstatSync(f.dest).isDirectory(), true);
	assert.equal(fs.readFileSync(path.join(f.site, 'offer.mdx'), 'utf8'), 'source');
});

test('CLI, Vite and Tailwind share one source; detach preserves local files', (t) => {
	const f = fixture(t);
	f.write(path.join(f.siteDir, 'banners.json'), { fixture: true });
	f.write(path.join(f.siteDir, 'pages/index.astro'), '<h1>Fixture</h1>');
	const env = { ...process.env };
	delete env.DOMAIN;
	delete env.ASTRO_JSON_LOCAL_PATH;
	execFileSync(process.execPath, [script, '--local-path', f.jsonRoot], { cwd: f.root, env });
	assert.deepEqual(linkedJsonSource(f.root), { jsonRoot: f.jsonRoot, siteDir: f.siteDir });
	assert.equal(fs.realpathSync(sourceLink(f.root)), f.siteDir);
	assert.ok(localJsonDev(f.root).config().server.fs.allow.includes(f.jsonRoot));
	assert.match(fs.readFileSync(path.join(f.root, 'src/pages/index.astro'), 'utf8'), /custom source/);
	detachJsonSource(f.root);
	assert.equal(linkedJsonSource(f.root), undefined);
	assert.equal(fs.lstatSync(path.join(f.root, 'src/data/site/banners.json')).isSymbolicLink(), false);
	assert.equal(fs.readFileSync(path.join(f.root, 'src/pages/index.astro'), 'utf8'), '<h1>Fixture</h1>');
	assert.deepEqual(localJsonDev(f.root), []);
});
