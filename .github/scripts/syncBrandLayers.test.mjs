import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { listFiles, syncBrandLayers } from './syncBrandLayers.mjs';

const makeTree = (spec) => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-brand-layers-'));
	for (const [relative, contents] of Object.entries(spec)) {
		const full = path.join(root, relative);
		fs.mkdirSync(path.dirname(full), {recursive: true});
		fs.writeFileSync(full, contents);
	}
	return root;
};

test('listFiles отдаёт относительные пути рекурсивно', () => {
	const root = makeTree({'a.mdx': '1', 'sub/b.mdx': '2'});
	assert.deepEqual(listFiles(root), ['a.mdx', 'sub/b.mdx']);
	assert.deepEqual(listFiles(path.join(root, 'nope')), []);
});

test('контент без столкновений копируется как есть', () => {
	const tmp = makeTree({
		'src/belgee.alexsab.ru/content/special-offers/leasing.mdx': 'belgee',
		'src/jetour.alexsab.ru/content/special-offers/credit.mdx': 'jetour',
	});
	const target = fs.mkdtempSync(path.join(os.tmpdir(), 'target-'));
	const result = syncBrandLayers({
		kind: 'content',
		tmpDir: tmp,
		brandDomains: ['belgee.alexsab.ru', 'jetour.alexsab.ru'],
		targetDir: target,
		pages: {},
	});
	assert.deepEqual(result.errors, []);
	assert.equal(result.copied, 2);
	assert.equal(fs.readFileSync(path.join(target, 'special-offers/leasing.mdx'), 'utf8'), 'belgee');
	assert.equal(fs.readFileSync(path.join(target, 'special-offers/credit.mdx'), 'utf8'), 'jetour');
});

test('столкнувшиеся записи расходятся по префиксам, первопроходец сохраняет имя', () => {
	const tmp = makeTree({
		'src/belgee.alexsab.ru/content/special-offers/trade-in.mdx': 'belgee',
		'src/jetour.alexsab.ru/content/special-offers/trade-in.mdx': 'jetour',
	});
	const target = fs.mkdtempSync(path.join(os.tmpdir(), 'target-'));
	const result = syncBrandLayers({
		kind: 'content',
		tmpDir: tmp,
		brandDomains: ['belgee.alexsab.ru', 'jetour.alexsab.ru'],
		targetDir: target,
		pages: {
			'/special-offers/': {
				collection: 'special-offers',
				entries: {'trade-in': {from: 'belgee'}},
			},
		},
	});
	assert.deepEqual(result.errors, []);
	assert.equal(fs.readFileSync(path.join(target, 'special-offers/trade-in.mdx'), 'utf8'), 'belgee');
	assert.equal(fs.readFileSync(path.join(target, 'special-offers/jetour-trade-in.mdx'), 'utf8'), 'jetour');
});

test('from: null разносит записи по обоим брендам', () => {
	const tmp = makeTree({
		'src/solaris.alexsab.ru/content/special-offers/credits.mdx': 'solaris',
		'src/wey.alexsab.ru/content/special-offers/credits.mdx': 'wey',
	});
	const target = fs.mkdtempSync(path.join(os.tmpdir(), 'target-'));
	const result = syncBrandLayers({
		kind: 'content',
		tmpDir: tmp,
		brandDomains: ['solaris.alexsab.ru', 'wey.alexsab.ru'],
		targetDir: target,
		pages: {
			'/special-offers/': {
				collection: 'special-offers',
				entries: {credits: {from: null}},
			},
		},
	});
	assert.deepEqual(result.errors, []);
	assert.equal(fs.existsSync(path.join(target, 'special-offers/credits.mdx')), false);
	assert.equal(fs.readFileSync(path.join(target, 'special-offers/solaris-credits.mdx'), 'utf8'), 'solaris');
	assert.equal(fs.readFileSync(path.join(target, 'special-offers/wey-credits.mdx'), 'utf8'), 'wey');
});

test('неразрешённое столкновение не пишет ничего и отдаёт ошибку', () => {
	const tmp = makeTree({
		'src/gac.alexsab.ru/pages/about.astro': 'gac',
		'src/jetour.alexsab.ru/pages/about.astro': 'jetour',
	});
	const target = fs.mkdtempSync(path.join(os.tmpdir(), 'target-'));
	const result = syncBrandLayers({
		kind: 'pages',
		tmpDir: tmp,
		brandDomains: ['gac.alexsab.ru', 'jetour.alexsab.ru'],
		targetDir: target,
		pages: {},
	});
	assert.equal(result.errors.length, 1);
	assert.equal(result.copied, 0);
	assert.equal(fs.existsSync(path.join(target, 'about.astro')), false, 'при ошибке не копируем ничего');
});

test('страница с only копируется от названного бренда', () => {
	const tmp = makeTree({
		'src/gac.alexsab.ru/pages/about.astro': 'gac',
		'src/jetour.alexsab.ru/pages/about.astro': 'jetour',
	});
	const target = fs.mkdtempSync(path.join(os.tmpdir(), 'target-'));
	const result = syncBrandLayers({
		kind: 'pages',
		tmpDir: tmp,
		brandDomains: ['gac.alexsab.ru', 'jetour.alexsab.ru'],
		targetDir: target,
		pages: {'/about/': {only: 'jetour'}},
	});
	assert.deepEqual(result.errors, []);
	assert.equal(fs.readFileSync(path.join(target, 'about.astro'), 'utf8'), 'jetour');
});

test('страница с from: null разъезжается по брендовым URL', () => {
	const tmp = makeTree({
		'src/jetour.alexsab.ru/pages/insurance.astro': 'jetour',
		'src/vgv.alexsab.ru/pages/insurance.astro': 'vgv',
	});
	const target = fs.mkdtempSync(path.join(os.tmpdir(), 'target-'));
	const result = syncBrandLayers({
		kind: 'pages',
		tmpDir: tmp,
		brandDomains: ['jetour.alexsab.ru', 'vgv.alexsab.ru'],
		targetDir: target,
		pages: {'/insurance/': {from: null}},
	});
	assert.deepEqual(result.errors, []);
	assert.equal(fs.existsSync(path.join(target, 'insurance.astro')), false);
	assert.equal(fs.readFileSync(path.join(target, 'jetour-insurance.astro'), 'utf8'), 'jetour');
	assert.equal(fs.readFileSync(path.join(target, 'vgv-insurance.astro'), 'utf8'), 'vgv');
});

test('выключенная страница не роняет синхронизацию', () => {
	const tmp = makeTree({
		'src/gac.alexsab.ru/pages/about.astro': 'gac',
		'src/jetour.alexsab.ru/pages/about.astro': 'jetour',
	});
	const target = fs.mkdtempSync(path.join(os.tmpdir(), 'target-'));
	const result = syncBrandLayers({
		kind: 'pages',
		tmpDir: tmp,
		brandDomains: ['gac.alexsab.ru', 'jetour.alexsab.ru'],
		targetDir: target,
		pages: {'/about/': {enabled: false}},
	});
	assert.deepEqual(result.errors, []);
	assert.equal(fs.readFileSync(path.join(target, 'about.astro'), 'utf8'), 'jetour');
});

test('отсутствующий бренд-каталог не ломает синхронизацию', () => {
	const tmp = makeTree({'src/belgee.alexsab.ru/content/news/one.mdx': 'belgee'});
	const target = fs.mkdtempSync(path.join(os.tmpdir(), 'target-'));
	const result = syncBrandLayers({
		kind: 'content',
		tmpDir: tmp,
		brandDomains: ['belgee.alexsab.ru', 'missing.alexsab.ru'],
		targetDir: target,
		pages: {},
	});
	assert.deepEqual(result.errors, []);
	assert.equal(result.copied, 1);
});