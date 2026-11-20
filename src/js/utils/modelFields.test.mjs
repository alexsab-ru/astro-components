import assert from 'node:assert/strict';
import test from 'node:test';
import { getModelFeedbackImage } from './modelFields.js';

test('feedback photo follows Hero even when an interior carousel is placed first', () => {
	const model = {
		media: { homeImg: '/car-hero.webp', thumb: '/thumb.webp' },
		colors: [{ image: '/white-car.webp' }],
		page: {
			blockOrder: ['carousel', 'exterior'],
			blocks: {
				carousel: {
					content: { images: [{ url: '/steering-wheel.webp' }] },
				},
				exterior: {
					content: { images: [{ url: '/exterior.webp' }] },
				},
			},
		},
	};
	const before = structuredClone(model);
	assert.equal(getModelFeedbackImage(model), '/car-hero.webp');
	assert.deepEqual(model, before);
	model.page.blockOrder.reverse();
	assert.equal(getModelFeedbackImage(model), '/car-hero.webp');
});

test('an explicit form image overrides Hero, including an intentionally empty image', () => {
	const model = {
		homeImg: '/hero.webp',
		page: { feedbackForm: { imageUrl: '/chosen.webp' } },
	};
	assert.equal(getModelFeedbackImage(model), '/chosen.webp');
	model.page.feedbackForm.imageUrl = '';
	assert.equal(getModelFeedbackImage(model), '');
});

test('legacy Hero and valid color photographs remain available without page content', () => {
	assert.equal(
		getModelFeedbackImage({ homeImg: '/legacy-hero.webp' }),
		'/legacy-hero.webp'
	);
	assert.equal(
		getModelFeedbackImage({ colors: [{}, { carImage: '/legacy-color.webp' }] }),
		'/legacy-color.webp'
	);
	assert.equal(
		getModelFeedbackImage({
			colors: [{ image: '/first.webp' }, { image: '/second.webp' }],
		}),
		'/first.webp'
	);
});

test('missing Hero and colors fall back to model media, while empty models stay empty', () => {
	assert.equal(
		getModelFeedbackImage({ media: { image: '/model.webp', thumb: '/thumb.webp' } }),
		'/model.webp'
	);
	assert.equal(
		getModelFeedbackImage({ media: { thumb: '/thumb.webp' } }),
		'/thumb.webp'
	);
	assert.equal(
		getModelFeedbackImage({ thumb: '/legacy-thumb.webp' }),
		'/legacy-thumb.webp'
	);
	assert.equal(getModelFeedbackImage(), '');
});
