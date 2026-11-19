import assert from 'node:assert/strict';
import test from 'node:test';
import {
	MODEL_PART_ORDER,
	resolveModelOrder,
	isModelPartVisible,
} from './model-layout.js';
import { loadModelPhotos } from './model-photos.js';

test('default and partial orders retain all existing parts', () => {
	assert.deepEqual(resolveModelOrder(), MODEL_PART_ORDER);
	assert.deepEqual(resolveModelOrder(['actions', 'hero']), [
		'actions',
		'hero',
		'colors',
		'media',
		'characteristics',
	]);
});
test('invalid keys and duplicates are ignored without mutating the inputs', () => {
	const input = ['media', 'unknown', 'media', 'colors'];
	assert.deepEqual(resolveModelOrder(input), [
		'media',
		'colors',
		'hero',
		'characteristics',
		'actions',
	]);
	assert.deepEqual(input, ['media', 'unknown', 'media', 'colors']);
	assert.deepEqual(resolveModelOrder({ hero: false }), MODEL_PART_ORDER);
	assert.deepEqual(resolveModelOrder([]), MODEL_PART_ORDER);
});
test('only explicit false disables a part, independently from its position', () => {
	const parts = { media: false, colors: true, price: false };
	assert.deepEqual(
		resolveModelOrder(['actions']).filter((key) =>
			isModelPartVisible(parts, key)
		),
		['actions', 'hero', 'colors', 'characteristics']
	);
	assert.equal(isModelPartVisible(parts, 'price'), false);
	assert.equal(isModelPartVisible(undefined, 'heading'), true);
});
test('no photo source performs no fetch', async () => {
	let calls = 0;
	assert.deepEqual(
		await loadModelPhotos(undefined, () => {
			calls++;
		}),
		[]
	);
	assert.equal(calls, 0);
});
test('photo feed keeps grouped order and the original one-level flattening', async () => {
	const payload = {
		first: ['/first.svg', '/second.svg'],
		second: ['/third.svg'],
		last: '/last.svg',
	};
	let source;
	assert.deepEqual(
		await loadModelPhotos('photos.json', async (url) => {
			source = url;
			return { json: async () => payload };
		}),
		['/first.svg', '/second.svg', '/third.svg', '/last.svg']
	);
	assert.equal(source, 'photos.json');
});
test('photo failures propagate rather than being silently swallowed', async () => {
	await assert.rejects(
		loadModelPhotos('photos.json', async () => {
			throw new Error('feed failed');
		}),
		/feed failed/
	);
});
