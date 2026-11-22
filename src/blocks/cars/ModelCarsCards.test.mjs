import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareModelCards } from './prepare-model-cards.js';
import { currencyFormat } from '../../js/utils/numbers.format.js';

test('lightbox offer keys are local to each model-card composition', () => {
	const first = prepare({ offerPrefix: 'first-' })[0];
	const second = prepare({ offerPrefix: 'second-' })[0];
	assert.notEqual(first.offerId, second.offerId);
	assert.ok(first.lightboxDescription.includes(first.offerId));
	assert.ok(second.lightboxDescription.includes(second.offerId));
});

const model = (id, extra = {}) => ({
	id,
	status: 'active',
	brand: { id: 'demo', displayName: 'Демо' },
	name: id,
	image: `/model-${id}.svg`,
	price: 2000000,
	...extra,
});
const car = (id, extra = {}) => ({
	id,
	data: {
		folder_id: 'a',
		images: [`/${id}-0.svg`, `/${id}-1.svg`, `/${id}-2.svg`],
		...extra,
	},
});
const models = [model('a'), model('b')];
const prepare = (options = {}) =>
	prepareModelCards({ models, testDriveModels: models, ...options }, (data) =>
		models.find((m) => m.id === data?.folder_id)
	);

test('minimum positive stock/model price and per-card override preserve precedence', () => {
	const cars = [
		car('first', { price: 2500000 }),
		car('second', {
			price: 2400000,
			sale_price: 1900000,
			priceWithDiscount: 1800000,
		}),
	];
	assert.equal(prepare({ cars })[0].price, currencyFormat(1800000));
	assert.equal(
		prepare({ cars: [cars[0]] })[0].price,
		currencyFormat(2000000)
	);
	assert.equal(
		prepare({ cars, overrides: [{ modelId: 'a', price: 2300000 }] })[0]
			.price,
		currencyFormat(2300000)
	);
	assert.equal(
		prepare({ cars, overrides: [{ modelId: 'a', price: -1 }] })[0].price,
		currencyFormat(1800000)
	);
	assert.equal(
		prepare({
			cars,
			overrides: [
				{
					modelId: 'a',
					price: 2300000,
					priceText: '<b>Особая цена</b>',
					pricePrefix: '',
				},
			],
		})[0].price,
		'<b>Особая цена</b>'
	);
});

test('stock matching, visibility, forced overrides and filtered alternation', () => {
	const options = {
		models: [
			model('a', { status: 'hide' }),
			...models.slice(1),
			model('c'),
		],
		cars: [car('in-b', { folder_id: 'b' })],
		onlyWithCars: true,
	};
	assert.deepEqual(
		prepare(options).map((c) => c.model.id),
		['b']
	);
	assert.deepEqual(
		prepare({
			...options,
			overrides: [
				{ modelId: 'a', show: true },
				{ modelId: 'c', show: true, order: 0 },
			],
		}).map((c) => [c.model.id, c.imgPlacement]),
		[
			['c', 'left'],
			['a', 'right'],
			['b', 'left'],
		]
	);
});

test('all image selection strategies and missing VIN fallback', () => {
	const cars = [
		car('first', { vin_list: 'VIN-1, VIN-ALT' }),
		car('second', { vin_hidden: 'VIN-2', url: '/cars/second-slug/' }),
	];
	const pick = (selection) =>
		prepare({ cars, imageSelection: selection })[0].images.map(
			(i) => i.imageUrl
		);
	assert.deepEqual(pick({ strategy: 'diagonal' }), [
		'/first-0.svg',
		'/second-1.svg',
	]);
	assert.deepEqual(
		pick({ strategy: 'first-car', indexes: [2, 0], limit: 1 }),
		['/first-2.svg']
	);
	assert.deepEqual(pick({ strategy: 'per-car', indexes: [1] }), [
		'/first-1.svg',
		'/second-1.svg',
	]);
	assert.deepEqual(
		pick({ strategy: 'vin', vin: ' vin-alt ', indexes: [2] }),
		['/first-2.svg']
	);
	assert.deepEqual(
		pick({ strategy: 'car', carId: 'second-slug', indexes: [1] }),
		['/second-1.svg']
	);
	assert.deepEqual(
		pick({ strategy: 'vin', vin: 'missing' }),
		pick({ strategy: 'diagonal' })
	);
});

test('image sources, duplicates, model fallback and missing images', () => {
	const c = car('first', {
		imageSets: [
			{ full: '/full.svg', large: '/large.svg' },
			{ full: '/full.svg', large: '/other.svg' },
		],
	});
	assert.deepEqual(
		prepare({ cars: [c] })[0].images.map((i) => [i.imageUrl, i.thumbUrl]),
		[['/full.svg', '/large.svg']]
	);
	assert.equal(prepare()[0].images[0].imageUrl, '/model-a.svg');
	assert.equal(
		prepare({ models: [model('x', { image: '', thumb: '' })] }).length,
		0
	);
	assert.equal(
		prepare({
			cars: [car('thumb', { images: [], thumbs: ['/thumb.svg'] })],
		})[0].images[0].imageUrl,
		'/thumb.svg'
	);
});

test('explicit photos, overlays, alt, placement, empty content and order', () => {
	const overlays = [{ position: 'center', html: '<b>Демо</b>' }];
	const result = prepare({
		overrides: [
			{
				modelId: 'b',
				order: 0,
				imgPlacement: 'right',
				images: [{ imageUrl: '/override.svg' }],
				imageOverlays: overlays,
				content: '',
				subtitle: '',
				contentItems: [],
			},
		],
	});
	assert.equal(result[0].model.id, 'b');
	assert.equal(result[0].imgPlacement, 'right');
	assert.deepEqual(result[0].images[0].overlays, overlays);
	assert.equal(result[0].images[0].alt, 'Демо b, фото 1');
	assert.equal(result[0].content, '');
	assert.deepEqual(result[0].contentItems, []);
	assert.equal(result[0].subtitle, '');
});

test('benefits keep maximum stock discount and model labels', () => {
	const result = prepare({
		models: [
			model('a', {
				benefit: 100,
				benefits: [{ label: '<b>Преимущество</b>' }],
			}),
		],
		cars: [
			car('1', { max_discount: 1000 }),
			car('2', { max_discount: 2000 }),
		],
	})[0];
	assert.deepEqual(result.contentItems, [
		`Выгода до ${currencyFormat(2000)}`,
		'<b>Преимущество</b>',
	]);
});

test('button override priority, popup metadata and explicit regular links', () => {
	const result = prepare({
		primaryButton: { title: 'Общее' },
		overrides: [
			{
				modelId: 'a',
				primaryButton: { title: 'Частное', dataFormName: 'card-form' },
				secondaryButton: { popup: false, url: '/test-drive/' },
			},
		],
	})[0];
	assert.equal(result.primaryButton.title, 'Частное');
	assert.equal(result.primaryButton.action.formName, 'card-form');
	assert.equal(result.primaryButton.action.title, 'Частное на&nbsp;Демо a');
	assert.equal(result.secondaryButton.action.type, 'link');
	assert.equal(result.secondaryButton.action.url, '/test-drive/');
	assert.ok(result.primaryButton.classes.includes('popup-link'));
});

test('inputs are unchanged and lightbox model identifiers are escaped', () => {
	const options = {
		models: [model('a\"<>')],
		cars: [car('one')],
		overrides: [],
	};
	const before = JSON.stringify(options);
	const result = prepare(options);
	assert.equal(JSON.stringify(options), before);
	assert.match(result[0].lightboxDescription, /a&amp;quot;|a&quot;&lt;&gt;/);
});

test('secondary test-drive action follows the matrix while other actions remain available', () => {
	const cards = prepare({ testDriveModels: [models[0]] });
	assert.equal(cards[0].secondaryButton.id, 'testDrive');
	assert.equal(cards[1].secondaryButton, null);
	assert.ok(cards[1].primaryButton);
	assert.ok(prepare({ testDriveModels: [] }).every((card) => card.secondaryButton === null));
	assert.equal(prepare({
		testDriveModels: [],
		secondaryButton: { id: 'details', title: 'Подробнее', url: '/details/', popup: false },
	})[0].secondaryButton.action.url, '/details/');
});
