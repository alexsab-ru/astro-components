import assert from 'node:assert/strict';
import test from 'node:test';

// The browser element's state transitions also run without a browser framework.
globalThis.HTMLElement = class {};
globalThis.customElements = { get: () => true };
const { ContentTabs, nextTabIndex } = await import('./tabs.js');

function node(dataset = {}) {
	return {
		dataset,
		attributes: {},
		setAttribute(name, value) { this.attributes[name] = value; },
		removeAttribute(name) { delete this.attributes[name]; },
	};
}

function instance(images = [{}, {}, {}]) {
	return {
		tabs: images.map(node),
		panels: images.map(() => node()),
		image: node(),
		media: node(),
		dataset: {},
		activate: ContentTabs.prototype.activate,
	};
}

test('keyboard wraps, handles Home/End and leaves other keys alone', () => {
	assert.equal(nextTabIndex('ArrowLeft', 0, 4), 3);
	assert.equal(nextTabIndex('ArrowRight', 3, 4), 0);
	assert.equal(nextTabIndex('Home', 2, 4), 0);
	assert.equal(nextTabIndex('End', 0, 4), 3);
	for (const key of ['Tab', 'Enter', ' ', 'ArrowDown']) {
		assert.equal(nextTabIndex(key, 2, 4), null);
	}
});

test('two instances keep independent selection, visibility and roving focus', () => {
	const first = instance();
	const second = instance();
	first.activate(0);
	second.activate(2);
	first.activate(1);
	assert.deepEqual(first.panels.map(panel => panel.hidden), [true, false, true]);
	assert.deepEqual(second.panels.map(panel => panel.hidden), [true, true, false]);
	assert.deepEqual(first.tabs.map(tab => tab.tabIndex), [-1, 0, -1]);
	assert.deepEqual(first.tabs.map(tab => tab.attributes['aria-selected']), ['false', 'true', 'false']);
	assert.equal(first.dataset.initial, '1');
	assert.equal(second.dataset.initial, '2');
});

test('switches image, alt and dimensions, and hides optional media', () => {
	const tabs = instance([
		{ imageSrc: '/one.svg', imageAlt: 'One', imageWidth: '640', imageHeight: '360' },
		{ imageSrc: '/two.svg', imageAlt: 'Two' },
		{},
	]);
	tabs.activate(0);
	assert.equal(tabs.image.src, '/one.svg');
	assert.deepEqual(tabs.image.attributes, { width: '640', height: '360' });
	tabs.activate(1);
	assert.equal(tabs.image.src, '/two.svg');
	assert.equal(tabs.image.alt, 'Two');
	assert.deepEqual(tabs.image.attributes, {});
	tabs.activate(2);
	assert.equal(tabs.media.hidden, true);
	tabs.activate(0);
	assert.equal(tabs.media.hidden, false);
});

test('panels without shared media work', () => {
	const tabs = instance();
	tabs.image = null;
	tabs.activate(1);
	assert.equal(tabs.panels[1].hidden, false);
});

test('only pointer activation scrolls its own content, respecting reduced motion', () => {
	const frames = [];
	globalThis.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
	globalThis.cancelAnimationFrame = () => {};
	globalThis.matchMedia = () => ({ matches: true });
	const first = instance();
	const second = instance();
	const calls = [];
	first.content = { scrollIntoView: options => calls.push(['first', options]) };
	second.content = { scrollIntoView: options => calls.push(['second', options]) };
	first.dataset.scroll = second.dataset.scroll = 'true';
	first.activate(1);
	assert.equal(frames.length, 0);
	second.activate(2, true);
	assert.equal(frames.length, 1);
	frames[0]();
	assert.deepEqual(calls, [['second', { behavior: 'instant', block: 'start' }]]);
	first.dataset.scroll = '';
	first.activate(0, true);
	assert.equal(frames.length, 1);
});
