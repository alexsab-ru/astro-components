import assert from 'node:assert/strict';
import test from 'node:test';
import { carouselBuffer } from './carousel-buffer.js';
test('empty and single-photo lists need no repeated frames', () => {
	assert.deepEqual(carouselBuffer([], 1400), { before: [], after: [] });
	assert.deepEqual(carouselBuffer([355], 1400), { before: [], after: [] });
});
test('each side covers dragging plus the visible frame across sizes and aspect ratios', () => {
	const widths = [355.55, 133.33, 200, 600, 355.55, 133.33];
	for (const viewport of [390, 1240, 1400, 1920, 2560, 3840]) {
		const { before, after } = carouselBuffer(widths, viewport, 10);
		for (const side of [before, after])
			assert.ok(
				side.reduce((sum, i) => sum + widths[i] + 10, 0) >=
					viewport * 2 + 600
			);
		assert.equal(before.at(-1), widths.length - 1);
		assert.equal(after[0], 0);
		const track = [...before, ...widths.map((_, i) => i), ...after];
		for (let i = 1; i < track.length; i++)
			assert.equal(track[i], (track[i - 1] + 1) % widths.length);
	}
});
test('large albums only copy short edge buffers rather than whole albums', () => {
	const { before, after } = carouselBuffer(Array(100).fill(400), 1400);
	assert.ok(before.length < 10 && after.length < 10);
});
test('planning keeps inputs unchanged and all logical indexes valid', () => {
	const widths = [130, 355, 600],
		copy = [...widths];
	const { before, after } = carouselBuffer(widths, 1400);
	assert.deepEqual(widths, copy);
	assert.ok(
		[...before, ...after].every(
			(i) => Number.isInteger(i) && i >= 0 && i < widths.length
		)
	);
});
