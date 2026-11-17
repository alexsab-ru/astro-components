import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.HTMLElement = class {};
globalThis.customElements = { get: () => true };
const { CollapsibleText } = await import('./collapsible-text.js');

let frames;
let scrolls;
function instance(scroll = 'none', fullHeight = 300, visibleHeight = 100) {
	frames = new Map();
	scrolls = [];
	let frameId = 0;
	globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
	globalThis.cancelAnimationFrame = id => frames.delete(id);
	globalThis.matchMedia = () => ({ matches: true });
	globalThis.document = { querySelector: () => ({ offsetHeight: 60 }) };
	globalThis.ResizeObserver = globalThis.MutationObserver = class {
		constructor(callback) { this.callback = callback; this.targets = []; }
		observe(target) { this.targets.push(target); }
		disconnect() { this.targets = []; }
	};
	globalThis.window = { scrollBy: options => scrolls.push(options), addEventListener() {}, removeEventListener() {} };
	const classes = () => {
		const values = new Set();
		return { toggle: (name, value) => value ? values.add(name) : values.delete(name), contains: name => values.has(name) };
	};
	const label = {};
	const listeners = new Map();
	const button = {
		hidden: true, classList: classes(), attributes: {},
		setAttribute(name, value) { this.attributes[name] = value; },
		querySelector: () => label,
		addEventListener: (event, callback) => listeners.set(event, callback),
		removeEventListener: (event, callback) => { if (listeners.get(event) === callback) listeners.delete(event); },
	};
	const content = { classList: classes(), scrollIntoView: options => scrolls.push(options), children: [],
		getBoundingClientRect: () => ({ width: 400 }), scrollHeight: fullHeight, clientHeight: visibleHeight,
		addEventListener() {}, removeEventListener() {},
	};
	const actions = { querySelector: () => button, hidden: true };
	const element = Object.assign(Object.create(CollapsibleText.prototype), {
		isConnected: true,
		dataset: { scroll, scrollTarget: 'content', expandLabel: 'More', collapseLabel: 'Less', collapsedContentClass: 'collapsed-type' },
		querySelector: selector => selector.includes('content') ? content : actions,
		getBoundingClientRect: () => ({ top: 200 }),
		scrollIntoView: options => scrolls.push(options),
		setExpanded: CollapsibleText.prototype.setExpanded,
	});
	CollapsibleText.prototype.connectedCallback.call(element);
	return { element, button, content, label, listeners, actions };
}

function flush() {
	const callbacks = [...frames.values()];
	frames.clear();
	callbacks.forEach(callback => callback());
}

test('initializes collapsed and toggles only the owning instance', () => {
	const a = instance('collapse');
	const b = instance('collapse');
	assert.equal(a.button.hidden, false);
	assert.equal(a.button.attributes['aria-expanded'], 'false');
	assert.equal(a.label.textContent, 'More');
	a.listeners.get('click')();
	assert.equal(a.element.dataset.expanded, 'true');
	assert.equal(a.button.attributes['aria-expanded'], 'true');
	assert.equal(a.label.textContent, 'Less');
	assert.equal(a.button.classList.contains('active'), true);
	assert.equal(b.element.dataset.expanded, 'false');
});

test('SEO scrolls to its content only when collapsing and respects reduced motion', () => {
	const { listeners } = instance('collapse');
	listeners.get('click')(); flush();
	assert.deepEqual(scrolls, []);
	listeners.get('click')(); flush();
	assert.deepEqual(scrolls, [{ block: 'start', behavior: 'instant' }]);
});

test('rich text switches collapsed typography without scrolling', () => {
	const { content, listeners } = instance();
	assert.equal(content.classList.contains('collapsed-type'), true);
	listeners.get('click')(); flush();
	assert.equal(content.classList.contains('collapsed-type'), false);
	listeners.get('click')(); flush();
	assert.equal(content.classList.contains('collapsed-type'), true);
	assert.deepEqual(scrolls, []);
});

test('disclaimer scrolls its own root both ways, accounting for the header', () => {
	const { element, listeners } = instance('toggle');
	element.dataset.scrollTarget = 'root';
	element.dataset.scrollOffsetSelector = '#header';
	globalThis.matchMedia = () => ({ matches: false });
	listeners.get('click')(); flush();
	globalThis.document.querySelector = () => null;
	listeners.get('click')(); flush();
	assert.deepEqual(scrolls, [{ top: 140, behavior: 'smooth' }, { block: 'start', behavior: 'smooth' }]);
});

test('rapid toggles cancel obsolete scroll and disconnect removes listener/frame', () => {
	const { element, listeners } = instance('collapse');
	listeners.get('click')();
	listeners.get('click')();
	assert.equal(frames.size, 1);
	listeners.get('click')();
	assert.equal(frames.size, 0);
	listeners.get('click')();
	CollapsibleText.prototype.disconnectedCallback.call(element);
	assert.equal(frames.size, 0);
	assert.equal(listeners.size, 0);
	CollapsibleText.prototype.connectedCallback.call(element);
	assert.equal(listeners.size, 1);
	assert.equal(element.dataset.expanded, 'false');
});


test('fitting content has no toggle or collapsed styling; overflow is recalculated in both directions', () => {
	const { element, button, content, actions } = instance('none', 50, 50);
	assert.equal(button.hidden, true);
	assert.equal(actions.hidden, true);
	assert.equal(element.dataset.overflow, 'false');
	assert.equal(button.attributes['aria-expanded'], 'true');
	assert.equal(content.classList.contains('collapsed-type'), false);
	content.scrollHeight = 300;
	content.clientHeight = 100;
	element.updateOverflow();
	assert.equal(button.hidden, false);
	assert.equal(element.dataset.expanded, 'false');
	assert.equal(content.classList.contains('collapsed-type'), true);
	element.setExpanded(true);
	element.updateOverflow();
	assert.equal(element.dataset.expanded, 'true');
	content.scrollHeight = content.clientHeight = 50;
	element.updateOverflow();
	assert.equal(button.hidden, true);
	assert.equal(actions.hidden, true);
});

test('content mutations and resizes schedule remeasurement; disconnect clears all resources', () => {
	const { element } = instance();
	element.resizeObserver.callback();
	element.mutationObserver.callback();
	assert.equal(frames.size, 1);
	flush();
	assert.equal(element.dataset.overflow, 'true');
	element.scheduleMeasure();
	CollapsibleText.prototype.disconnectedCallback.call(element);
	assert.equal(frames.size, 0);
	assert.equal(element.resizeObserver.targets.length, 0);
	assert.equal(element.mutationObserver.targets.length, 0);
});
