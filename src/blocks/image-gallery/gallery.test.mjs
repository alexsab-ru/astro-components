import assert from 'node:assert/strict';
import test from 'node:test';
import { createGalleryBlocks } from './gallery-layout.js';
import { createGalleryGroup, galleryImageAttributes } from './gallery-data.js';

const images = count => Array.from({ length: count }, (_, index) => Object.freeze({ url: `/image-${index}.svg` }));
const spans = blocks => blocks.map(block => block.items.map(item => Number(item.linkClass.match(/col-span-(\d+)/)[1])));

test('mosaic preserves the distinct layouts for one through seven images', () => {
	const expected = [[], [[12]], [[6, 6]], [[6, 6, 12]], [[8, 4, 4, 8]], [[7, 5, 5, 6, 6]], [[4, 8, 8, 4, 6, 6]], [[4, 8, 8, 4, 6, 6], [12]]];
	for (let count = 0; count <= 7; count++) assert.deepEqual(spans(createGalleryBlocks(images(count))), expected[count]);
	assert.match(createGalleryBlocks(images(1))[0].items[0].imageClass, /object-contain/);
	const five = createGalleryBlocks(images(5))[0].items;
	assert.match(five[0].linkClass, /row-span-2/);
	assert.match(createGalleryBlocks(images(4))[0].items[1].linkClass, /self-stretch/);
});

test('large mosaics keep every image in order, including the last full-width seventh image', () => {
	assert.deepEqual(spans(createGalleryBlocks(images(13))), [[4, 8, 8, 4, 6, 6], [4, 8, 8, 4, 6, 6], [12]]);
	for (let count = 0; count <= 40; count++) {
		const source = Object.freeze(images(count));
		const result = createGalleryBlocks(source);
		assert.deepEqual(result.flatMap(block => block.items.map(item => item.image)), source);
		assert.equal(result.flatMap(block => block.items).some(item => !item.image), false);
	}
});

test('simple layout keeps a single image natural and separates the odd last image', () => {
	assert.deepEqual(createGalleryBlocks([], 'simple'), []);
	const single = createGalleryBlocks(images(1), 'simple');
	assert.equal(single[0].className, undefined);
	assert.equal(single[0].items[0].linkClass, 'block');
	assert.match(single[0].items[0].imageClass, /h-auto/);
	for (let count = 2; count <= 14; count++) {
		const source = Object.freeze(images(count));
		const blocks = createGalleryBlocks(source, 'simple');
		assert.equal(blocks.length, count % 2 ? 2 : 1);
		assert.equal(blocks[0].items.length, count % 2 ? count - 1 : count);
		assert.match(blocks[0].className, /grid-cols-2/);
		assert.deepEqual(blocks.flatMap(block => block.items.map(item => item.image)), source);
		if (count % 2) {
			assert.equal(blocks[1].items[0].linkClass, 'block mt-4');
			assert.match(blocks[1].items[0].imageClass, /h-auto/);
		}
	}
});

test('default groups are independent while explicit groups can intentionally join galleries', () => {
	const first = createGalleryGroup();
	const second = createGalleryGroup();
	assert.notEqual(first, second);
	assert.match(first, /^gallery-/);
	assert.equal(createGalleryGroup('shared-gallery'), 'shared-gallery');
	assert.equal(createGalleryGroup('shared-gallery'), createGalleryGroup('shared-gallery'));
	assert.equal(createGalleryGroup(''), '');
});

test('alt fallback preserves empty titles and descriptions keep their original text/html modes', () => {
	const image = { url: '/one.svg?first=1&second=2', title: 'Название', description: ' <strong>Описание</strong> &amp; детали ' };
	assert.deepEqual(galleryImageAttributes(image, 'Запасной'), {
		src: image.url, alt: 'Название', title: 'Название', description: 'Описание &amp; детали',
	});
	assert.equal(galleryImageAttributes(image, undefined, 'html').description, image.description);
	assert.equal(galleryImageAttributes({ url: '/empty.svg' }, 'Запасной').alt, 'Запасной');
	assert.equal(galleryImageAttributes({ url: '/empty.svg', title: '' }, 'Запасной').alt, '');
	const empty = galleryImageAttributes({ url: '/empty.svg' });
	assert.equal(empty.alt, '');
	assert.equal(empty.title, undefined);
	assert.equal(empty.description, undefined);
});
