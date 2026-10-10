import assert from 'node:assert/strict';
import test from 'node:test';
import LazyLoader from './LazyLoader.js';

function fixture(t, { deferred = true, observer = true } = {}) {
	const wrapper = {
		classList: new Set(['lazy']),
		querySelectorAll: () => [media],
	};
	wrapper.classList.remove = wrapper.classList.delete.bind(wrapper.classList);
	const media = new EventTarget();
	Object.assign(media, {
		tagName: 'IMG', dataset: deferred ? { src: '/real.svg' } : {},
		src: '/existing.svg', complete: false, naturalWidth: 0,
		classList: { remove() {} }, closest: () => wrapper,
	});
	const unobserved = [];
	const observed = [];
	class Observer {
		constructor(callback) { this.callback = callback; }
		observe(el) { observed.push(el); }
		unobserve(el) { unobserved.push(el); }
	}
	t.mock.method(globalThis, 'setTimeout', (fn) => { retry = fn; });
	let retry;
	const previous = { document: globalThis.document, window: globalThis.window, IntersectionObserver: globalThis.IntersectionObserver };
	globalThis.document = { querySelectorAll: () => [wrapper] };
	globalThis.window = new EventTarget();
	globalThis.IntersectionObserver = observer ? Observer : undefined;
	t.after(() => Object.assign(globalThis, previous));
	const loader = new LazyLoader();
	return { loader, media, wrapper, observed, unobserved, retry: () => retry?.() };
}

test('ordinary images retain their src and their wrapper is released', (t) => {
	const { media, wrapper, observed } = fixture(t, { deferred: false });
	assert.equal(media.src, '/existing.svg');
	assert.equal(media.dataset.loaded, undefined);
	assert.equal(observed.length, 0);
	assert.equal(wrapper.classList.has('lazy'), false);
});

test('deferred images are marked loaded only after load succeeds', (t) => {
	const { loader, media, wrapper, unobserved } = fixture(t);
	loader.handleIntersect([{ target: media, isIntersecting: true }]);
	assert.equal(media.src, '/real.svg');
	assert.equal(media.dataset.loaded, undefined);
	assert.equal(unobserved.length, 0);
	media.dispatchEvent(new Event('load'));
	assert.equal(media.dataset.loaded, 'true');
	assert.equal(wrapper.classList.has('lazy'), false);
	assert.deepEqual(unobserved, [media]);
});

test('failure allows one automatic retry and another attempt when connection returns', (t) => {
	const { loader, media, retry } = fixture(t);
	loader.load(media);
	media.dispatchEvent(new Event('error'));
	assert.equal(media.dataset.loaded, undefined);
	assert.equal(media.dataset.loadError, 'true');
	retry();
	assert.equal(loader.states.get(media).attempts, 2);
	media.dispatchEvent(new Event('error'));
	loader.load(media);
	assert.equal(loader.states.get(media).attempts, 2);
	window.dispatchEvent(new Event('online'));
	assert.equal(loader.states.get(media).attempts, 1);
	media.dispatchEvent(new Event('load'));
	assert.equal(media.dataset.loaded, 'true');
	assert.equal(media.dataset.loadError, undefined);
});

test('loads without IntersectionObserver instead of leaving placeholders indefinitely', (t) => {
	const { media } = fixture(t, { observer: false });
	assert.equal(media.src, '/real.svg');
	media.dispatchEvent(new Event('load'));
	assert.equal(media.dataset.loaded, 'true');
});
