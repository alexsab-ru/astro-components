import assert from 'node:assert/strict';
import test from 'node:test';
import { getLocalAnchorId } from './localAnchor.js';

const current = 'https://dealer.test/city/?utm_source=ad';

test('relative anchors preserve the current campaign and query parameters', () => {
	assert.equal(getLocalAnchorId('#credit', current), 'credit');
	assert.equal(getLocalAnchorId('/city/?utm_source=ad#cars', current), 'cars');
	assert.equal(getLocalAnchorId('/#cars', 'https://dealer.test/'), 'cars');
});

test('links to the homepage, other pages, queries and origins remain navigation', () => {
	for (const href of ['/#cars', '/pro/#cars', '/city/#cars', 'https://other.test/city/?utm_source=ad#cars', 'tel:+79990000000']) {
		assert.equal(getLocalAnchorId(href, current), null);
	}
});

test('encoded IDs are decoded while invalid or empty anchors are ignored', () => {
	assert.equal(getLocalAnchorId('#test%20drive', current), 'test drive');
	assert.equal(getLocalAnchorId('#bad%ZZ', current), null);
	assert.equal(getLocalAnchorId('#', current), null);
});
