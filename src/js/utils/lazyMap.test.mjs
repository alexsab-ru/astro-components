import assert from 'node:assert/strict';
import test from 'node:test';
import { loadMapScript, observeMap, withTimeout } from './lazyMap.js';

test('timeout bounds a stalled map request', async (t) => {
	t.mock.timers.enable({ apis: ['setTimeout'] });
	const result = assert.rejects(withTimeout(new Promise(() => {}), 50), /map_load_timeout/);
	t.mock.timers.tick(50);
	await result;
});

test('failed script can be retried; successful loading is shared', async (t) => {
	const elements = [];
	const previous = globalThis.document;
	globalThis.document = {
		createElement: () => ({ remove() { this.removed = true; } }),
		head: { appendChild: (script) => elements.push(script) },
	};
	t.after(() => { globalThis.document = previous; });
	const first = loadMapScript('https://example.com/map-retry.js');
	const failure = assert.rejects(first, /map_script_error/);
	elements[0].onerror();
	await failure;
	assert.equal(elements[0].removed, true);
	const retry = loadMapScript('https://example.com/map-retry.js');
	assert.equal(elements.length, 2);
	assert.equal(loadMapScript('https://example.com/map-retry.js'), retry);
	elements[1].onload();
	await retry;
});

test('map starts without IntersectionObserver support', (t) => {
	const previous = globalThis.IntersectionObserver;
	globalThis.IntersectionObserver = undefined;
	t.after(() => { globalThis.IntersectionObserver = previous; });
	let loads = 0;
	observeMap({}, () => loads++);
	assert.equal(loads, 1);
});
