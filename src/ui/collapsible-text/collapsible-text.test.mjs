import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.HTMLElement = class {};
globalThis.customElements = { get: () => true };
const { CollapsibleText } = await import('./collapsible-text.js');

let frames;
let scrolls;
function instance(variant) {
	frames = new Map();
	scrolls = [];
	let frameId = 0;
	globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
	globalThis.cancelAnimationFrame = id => frames.delete(id);
	globalThis.matchMedia = () => ({ matches: true });
	globalThis.document = { getElementById: () => ({ offsetHeight: 60 }) };
	globalThis.window = { scrollBy: options => scrolls.push(options) };
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
	const content = { classList: classes(), scrollIntoView: options => scrolls.push(options) };
	const element = {
		dataset: { variant, expandLabel: 'More', collapseLabel: 'Less' },
		querySelector: selector => selector.includes('content') ? content : button,
		getBoundingClientRect: () => ({ top: 200 }),
		setExpanded: CollapsibleText.prototype.setExpanded,
	};
	CollapsibleText.prototype.connectedCallback.call(element);
	return { element, button, content, label, listeners };
}

function flush() {
	const callbacks = [...frames.values()];
	frames.clear();
	callbacks.forEach(callback => callback());
}

test('initializes collapsed and toggles only the owning instance', () => {
	const a = instance('seo');
	const b = instance('seo');
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
	const { listeners } = instance('seo');
	listeners.get('click')(); flush();
	assert.deepEqual(scrolls, []);
	listeners.get('click')(); flush();
	assert.deepEqual(scrolls, [{ block: 'start', behavior: 'instant' }]);
});

test('rich text switches collapsed typography without scrolling', () => {
	const { content, listeners } = instance('rich');
	assert.equal(content.classList.contains('seo-content'), true);
	listeners.get('click')(); flush();
	assert.equal(content.classList.contains('seo-content'), false);
	listeners.get('click')(); flush();
	assert.equal(content.classList.contains('seo-content'), true);
	assert.deepEqual(scrolls, []);
});

test('disclaimer scrolls its own root both ways, accounting for the header', () => {
	const { listeners } = instance('disclaimer');
	globalThis.matchMedia = () => ({ matches: false });
	listeners.get('click')(); flush();
	globalThis.document.getElementById = () => null;
	listeners.get('click')(); flush();
	assert.deepEqual(scrolls, [{ top: 140, behavior: 'smooth' }, { top: 200, behavior: 'smooth' }]);
});

test('rapid toggles cancel obsolete scroll and disconnect removes listener/frame', () => {
	const { element, listeners } = instance('seo');
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
