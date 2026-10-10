import assert from 'node:assert/strict';
import test from 'node:test';
import { getVisibleMessageRect, isMessageVisible, observeMessageVisibility } from './messageVisibility.js';

const box = (left, top, width, height) => ({ left, top, right: left + width, bottom: top + height, width, height });

function fixture(t, { observer = true } = {}) {
	t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
	const doc = new EventTarget();
	const win = new EventTarget();
	Object.assign(win, {
		setTimeout, clearTimeout, performance: { now: () => Date.now() },
		getComputedStyle: (el) => el.style,
	});
	Object.assign(doc, { defaultView: win, visibilityState: 'visible', documentElement: { clientWidth: 375, clientHeight: 667 } });
	const scroller = {
		parentElement: null,
		style: { opacity: '1', overflowX: 'hidden', overflowY: 'auto' },
		clientLeft: 0, clientTop: 0, clientWidth: 300, clientHeight: 200,
		getBoundingClientRect: () => box(0, 100, 300, 200),
	};
	const element = {
		ownerDocument: doc, isConnected: true, parentElement: scroller,
		style: { opacity: '1', display: 'block', visibility: 'visible' },
		rect: box(10, 120, 100, 40),
		getBoundingClientRect() { return this.rect; },
		contains(target) { return target === this; },
	};
	doc.elementFromPoint = () => element;
	let callback;
	let disconnected = false;
	let options;
	win.IntersectionObserver = observer ? class {
		constructor(fn, opts) { callback = fn; options = opts; }
		observe() {}
		disconnect() { disconnected = true; }
	} : undefined;
	return {
		element, scroller, doc, win,
		enter: (fraction = 1) => callback([{ target: element, isIntersecting: fraction > 0, intersectionRatio: fraction }]),
		get options() { return options; },
		get disconnected() { return disconnected; },
	};
}

test('clips the actual bubble by internal scroll area, not just page viewport', (t) => {
	const f = fixture(t);
	assert.ok(getVisibleMessageRect(f.element));
	f.element.rect = box(10, 290, 100, 40);
	assert.equal(getVisibleMessageRect(f.element), null);
	f.element.rect = box(10, 280, 100, 40);
	assert.ok(getVisibleMessageRect(f.element));
});

test('does not count hidden, animated, zero-area or covered messages', (t) => {
	const f = fixture(t);
	assert.equal(isMessageVisible(f.element), true);
	f.element.style.opacity = '0.8';
	assert.equal(isMessageVisible(f.element), false);
	f.element.style.opacity = '1';
	f.doc.elementFromPoint = () => ({ overlay: true });
	assert.equal(isMessageVisible(f.element), false);
	f.doc.elementFromPoint = () => f.element;
	f.element.rect = box(10, 120, 0, 40);
	assert.equal(isMessageVisible(f.element), false);
});

test('document root overflow is measured at the viewport after page scrolling', (t) => {
	const f = fixture(t);
	Object.assign(f.doc.documentElement, {
		parentElement: null, clientLeft: 0, clientTop: 0,
		style: { opacity: '1', overflowX: 'auto', overflowY: 'auto' },
		getBoundingClientRect: () => box(0, -900, 375, 1400),
	});
	f.scroller.parentElement = f.doc.documentElement;
	assert.ok(getVisibleMessageRect(f.element));
});

test('requires 500 continuous milliseconds and fires only once', (t) => {
	const f = fixture(t);
	let calls = 0;
	observeMessageVisibility(f.element, () => calls++);
	assert.equal(calls, 0);
	assert.equal(f.options.rootMargin, '0px');
	f.enter();
	for (let i = 0; i < 4; i++) t.mock.timers.tick(100);
	assert.equal(calls, 0);
	t.mock.timers.tick(100);
	assert.equal(calls, 1);
	assert.equal(f.disconnected, true);
	f.enter();
	f.win.dispatchEvent(new Event('scroll'));
	t.mock.timers.tick(1000);
	assert.equal(calls, 1);
});

test('background tab resets the viewing interval', (t) => {
	const f = fixture(t);
	let calls = 0;
	observeMessageVisibility(f.element, () => calls++);
	f.enter();
	for (let i = 0; i < 4; i++) t.mock.timers.tick(100);
	f.doc.visibilityState = 'hidden';
	f.doc.dispatchEvent(new Event('visibilitychange'));
	t.mock.timers.tick(1000);
	assert.equal(calls, 0);
	f.doc.visibilityState = 'visible';
	f.doc.dispatchEvent(new Event('visibilitychange'));
	for (let i = 0; i < 4; i++) t.mock.timers.tick(100);
	assert.equal(calls, 0);
	t.mock.timers.tick(100);
	assert.equal(calls, 1);
});

test('opening a modal resets visibility even without an observer geometry change', (t) => {
	const f = fixture(t);
	let calls = 0;
	observeMessageVisibility(f.element, () => calls++);
	f.enter();
	t.mock.timers.tick(100);
	f.doc.elementFromPoint = () => ({ overlay: true });
	for (let i = 0; i < 6; i++) t.mock.timers.tick(100);
	assert.equal(calls, 0);
	f.doc.elementFromPoint = () => f.element;
	// First tick discovers the uncovered bubble and starts a fresh interval.
	for (let i = 0; i < 5; i++) t.mock.timers.tick(100);
	assert.equal(calls, 0);
	t.mock.timers.tick(100);
	assert.equal(calls, 1);
});

test('fallback measures geometry; unmount cancels tracking', (t) => {
	const f = fixture(t, { observer: false });
	let calls = 0;
	const stop = observeMessageVisibility(f.element, () => calls++);
	t.mock.timers.tick(100);
	stop();
	t.mock.timers.tick(1000);
	assert.equal(calls, 0);
});

test('fallback still confirms real visibility if observer construction fails', (t) => {
	const f = fixture(t);
	f.win.IntersectionObserver = class { constructor() { throw new Error('observer unavailable'); } };
	let calls = 0;
	observeMessageVisibility(f.element, () => calls++);
	for (let i = 0; i < 5; i++) t.mock.timers.tick(100);
	assert.equal(calls, 1);
});

test('scrolling away resets rather than accumulating short glimpses', (t) => {
	const f = fixture(t);
	let calls = 0;
	observeMessageVisibility(f.element, () => calls++);
	f.enter();
	for (let i = 0; i < 4; i++) t.mock.timers.tick(100);
	f.enter(0);
	t.mock.timers.tick(1000);
	f.enter();
	for (let i = 0; i < 4; i++) t.mock.timers.tick(100);
	assert.equal(calls, 0);
	t.mock.timers.tick(100);
	assert.equal(calls, 1);
});
