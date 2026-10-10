import assert from 'node:assert/strict';
import test from 'node:test';
import { getInlineLogo, prepareInlineLogo } from './inlineLogo.js';

test('scales SVG without a viewBox and preserves accessible name', () => {
	const result = prepareInlineLogo('<svg width="200px" height="40px"><path fill="#123456" d="M0 0h200v40H0z"/></svg>', { label: 'Дилер & бренд', className: 'h-8 w-auto' });
	assert.match(result, /viewBox="0 0 200 40"/);
	assert.match(result, /aria-label="Дилер &amp; бренд"/);
	assert.match(result, /class="h-8 w-auto"/);
	assert.match(result, /fill="#123456"/);
});

test('inlines CSS and namespaces gradient references', () => {
	const source = '<svg viewBox="0 0 10 10"><style>.paint{fill:url(#paint)}</style><defs><linearGradient id="paint"><stop offset="0" stop-color="red"/></linearGradient></defs><path class="paint" d="M0 0h10v10z"/><path class="paint" d="M0 0h1v1z"/></svg>';
	const result = prepareInlineLogo(source, { prefix: 'brand' });
	assert.ok(result);
	assert.doesNotMatch(result, /<style/);
	assert.match(result, /id="brand__paint"/);
	assert.match(result, /url\(#brand__paint\)/);
});

test('rejects active SVG and references outside the inline graphic', () => {
	for (const content of [
		'<script>alert(1)</script>',
		'<foreignObject><div>html</div></foreignObject>',
		'<path onload="alert(1)"/>',
		'<use href="https://example.com/logo.svg#x"/>',
		'<image href="data:image/svg+xml;base64,PHN2Zz4="/>',
		'<path fill="url(https://example.com/paint)"/>',
	]) assert.equal(prepareInlineLogo(`<svg viewBox="0 0 10 10">${content}</svg>`), null);
	assert.equal(prepareInlineLogo('<!DOCTYPE svg><svg viewBox="0 0 1 1"/>'), null);
});

test('permits embedded raster images used by the real GAC logo', () => {
	assert.ok(prepareInlineLogo('<svg viewBox="0 0 1 1"><image href="data:image/png;base64,aGVsbG8="/></svg>'));
});

test('fetches trusted SVG once, supports URL query and distinct instances', async (t) => {
	let calls = 0;
	t.mock.method(globalThis, 'fetch', async () => {
		calls += 1;
		return new Response('<svg viewBox="0 0 1 1"><path id="p"/></svg>');
	});
	const src = 'https://cdn.alexsab.ru/logo/test-inline.svg?v=2';
	const brand = await getInlineLogo(src, { instance: 'brand' });
	const dealer = await getInlineLogo(src, { instance: 'dealer' });
	assert.equal(calls, 1);
	assert.ok(brand && dealer);
	assert.notEqual(brand, dealer);
	assert.equal(await getInlineLogo('https://example.com/logo.svg'), null);
	assert.equal(await getInlineLogo('https://cdn.alexsab.ru/logo/test.png'), null);
	assert.equal(calls, 1);
});

test('remote failure falls back without breaking page rendering', async (t) => {
	t.mock.method(globalThis, 'fetch', async () => { throw new Error('offline'); });
	assert.equal(await getInlineLogo('https://cdn.alexsab.ru/logo/offline.svg'), null);
});
