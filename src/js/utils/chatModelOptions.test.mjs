import assert from 'node:assert/strict';
import test from 'node:test';
import { getChatModelOption } from './chatModelOptions.js';

const model = {
	id: 's50',
	brand: { displayName: 'Belgee' },
	displayName: 'S50',
	slogan: 'Надежный партнер',
	price: '1629990',
	benefit: '300000',
	media: { thumb: '/thumb.png', chat: '/chat.webp' },
};

test('uses model amounts and the current thumbnail by default', () => {
	assert.deepEqual(getChatModelOption(model), {
		label: 'Belgee S50',
		value: 's50',
		description: 'Надежный партнер',
		image: '/thumb.png',
		price: 1629990,
		benefit: 300000,
	});
});

test('price and benefit switches work independently', () => {
	const withoutPrice = getChatModelOption(model, { showPrice: false });
	assert.equal(withoutPrice.price, undefined);
	assert.equal(withoutPrice.benefit, 300000);
	const withoutBenefit = getChatModelOption(model, { showBenefit: false });
	assert.equal(withoutBenefit.price, 1629990);
	assert.equal(withoutBenefit.benefit, undefined);
});

test('real photo is opt-in and falls back to the current thumbnail', () => {
	const settings = { showRealPhoto: true };
	assert.equal(getChatModelOption(model, settings).image, '/chat.webp');
	for (const chat of [undefined, '']) {
		assert.equal(
			getChatModelOption({ ...model, media: { thumb: '/thumb.png', chat } }, settings).image,
			'/thumb.png'
		);
	}
	assert.equal(getChatModelOption({ ...model, media: undefined, thumb: '/legacy.png' }, settings).image, '/legacy.png');
});

test('missing, zero and invalid amounts produce no price or benefit', () => {
	for (const amount of [undefined, null, '', ' ', 0, '0', -1, 'unknown', '{{price}}', Infinity]) {
		const option = getChatModelOption({ ...model, price: amount, benefit: amount });
		assert.equal(option.price, undefined);
		assert.equal(option.benefit, undefined);
	}
});
