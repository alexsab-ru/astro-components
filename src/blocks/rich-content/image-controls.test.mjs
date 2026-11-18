import assert from 'node:assert/strict';
import test from 'node:test';
import { alignImageControls, updateImageControlPosition } from './image-controls.js';

function fixture(height) {
	const frame = { offsetHeight: height };
	const properties = new Map();
	const events = new Map();
	const slider = {
		querySelector: () => frame,
		querySelectorAll: () => [frame],
		style: { setProperty: (key, value) => properties.set(key, value) },
		// A long caption must not affect the photo's navigation center.
		offsetHeight: 900,
	};
	const swiper = {
		on: (event, callback) => events.set(event, callback),
		off: (event, callback) => { if (events.get(event) === callback) events.delete(event); },
	};
	return { frame, properties, events, slider, swiper };
}

test('navigation follows the photo center, independently of caption height', () => {
	const f = fixture(180);
	updateImageControlPosition(f.slider);
	assert.equal(f.properties.get('--rich-images-control-top'), '90px');
	f.slider.offsetHeight = 1400;
	updateImageControlPosition(f.slider);
	assert.equal(f.properties.get('--rich-images-control-top'), '90px');
});

test('hidden frames wait for measurable dimensions', () => {
	const f = fixture(0);
	updateImageControlPosition(f.slider);
	assert.equal(f.properties.size, 0);
	f.frame.offsetHeight = 240;
	updateImageControlPosition(f.slider);
	assert.equal(f.properties.get('--rich-images-control-top'), '120px');
});

test('resizes and slide changes update only the owning slider and destroy cleans listeners', () => {
	const observers = [];
	globalThis.ResizeObserver = class {
		constructor(callback) { this.callback = callback; observers.push(this); }
		observe() {}
		disconnect() { this.disconnected = true; }
	};
	const first = fixture(160);
	const second = fixture(320);
	alignImageControls(first.slider, first.swiper);
	const cleanupSecond = alignImageControls(second.slider, second.swiper);
	first.frame.offsetHeight = 200;
	first.events.get('resize')();
	assert.equal(first.properties.get('--rich-images-control-top'), '100px');
	assert.equal(second.properties.get('--rich-images-control-top'), '160px');
	first.frame.offsetHeight = 240;
	observers[0].callback();
	assert.equal(first.properties.get('--rich-images-control-top'), '120px');
	first.events.get('destroy')();
	assert.equal(first.events.size, 0);
	assert.equal(observers[0].disconnected, true);
	cleanupSecond();
	cleanupSecond();
	assert.equal(second.events.size, 0);
	delete globalThis.ResizeObserver;
});
