import assert from 'node:assert/strict';
import test from 'node:test';
import { legacyPopupId, resolveCardAction } from './resolveCardAction.js';
import { withLegacyServiceAction } from '../../blocks/services-alt/legacyAction.js';

test('missing URLs and old no-op placeholders are noninteractive', () => {
	for (const source of [undefined, null, {}, { url: '' }, { url: '#' }, { url: 'javascript:void(0)' }]) {
		assert.deepEqual(resolveCardAction(source), { type: 'none' });
	}
});

test('explicit none overrides a previously clickable card', () => {
	assert.deepEqual(resolveCardAction({ url: '#common-modal', action: { type: 'none' } }), { type: 'none' });
});

test('legacy modal fragments are exact and normal page anchors remain links', () => {
	assert.equal(legacyPopupId('#common-modal'), 'common-modal');
	assert.equal(legacyPopupId(' #common-modal-service '), 'common-modal-service');
	for (const url of ['#services', '/service/#common-modal', 'https://example.com/#common-modal', '#common-modal?x=1']) {
		assert.equal(legacyPopupId(url), '');
		assert.equal(resolveCardAction({ url }).type, 'link');
	}
});

test('a popup may use an arbitrary local ID and preserves its form metadata', () => {
	assert.deepEqual(resolveCardAction({
		title: 'Card title',
		action: { type: 'popup', id: '#service-dialog', title: 'Modal title', formName: 'Service', chooseDepartment: false, comment: 'Details' },
	}), {
		type: 'popup', id: 'service-dialog', href: '#service-dialog',
		popup: { title: 'Modal title', formName: 'Service', chooseDepartment: false, comment: 'Details' },
	});
	assert.equal(resolveCardAction({ action: { type: 'popup' } }).id, 'common-modal');
	assert.equal(resolveCardAction({ action: { type: 'popup', id: 'https://example.com/dialog' } }).type, 'none');
});

test('explicit link keeps both local and external URLs in the current tab by default', () => {
	for (const url of ['/service/', '#details', 'https://example.com/promo', 'tel:+70000000000', 'mailto:demo@example.com']) {
		assert.deepEqual(resolveCardAction({ action: { type: 'link', url } }), { type: 'link', href: url, target: undefined, rel: undefined });
	}
	assert.equal(resolveCardAction({ action: { type: 'link', url: '#common-modal' } }).type, 'link');
});

test('new-tab actions and legacy targets get safe rel without losing other tokens', () => {
	for (const source of [
		{ action: { type: 'new-tab', url: 'https://example.com', rel: 'nofollow noopener' } },
		{ url: 'https://example.com', target: '_blank', rel: 'nofollow noopener' },
	]) {
		assert.deepEqual(resolveCardAction(source), {
			type: 'new-tab', href: 'https://example.com', target: '_blank', rel: 'nofollow noopener noreferrer',
		});
	}
	assert.equal(resolveCardAction({ url: '/service/', target: '_self' }).target, '_self');
});

test('unsafe or incomplete explicit actions never fall back to a legacy click', () => {
	for (const action of [
		{ type: 'link', url: 'javascript:alert(1)' },
		{ type: 'link', url: 'java\nscript:alert(1)' },
		{ type: 'link', url: 'data:text/html,hello' },
		{ type: 'new-tab' },
		{ type: 'unknown', url: '/service/' },
	]) {
		assert.deepEqual(resolveCardAction({ url: '/old/', action }), { type: 'none' });
	}
});

test('service adapters preserve old popup defaults and accept explicit new actions', () => {
	const item = { title: 'Diagnostics', img: '/demo.svg' };
	assert.equal(withLegacyServiceAction(item), item);
	assert.deepEqual(withLegacyServiceAction(item, true).action, {
		type: 'popup', id: 'common-modal', title: 'Diagnostics', formName: 'Запись на сервис. Diagnostics',
	});
	assert.equal(withLegacyServiceAction({ ...item, url: '#common-modal' }).action.formName, 'Запись на сервис. Diagnostics');
	assert.equal(withLegacyServiceAction({ ...item, url: '#details' }).action, undefined);
	const staticItem = { ...item, action: { type: 'none' } };
	assert.equal(withLegacyServiceAction(staticItem, true), staticItem);
});
