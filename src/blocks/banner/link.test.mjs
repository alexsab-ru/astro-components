import assert from 'node:assert/strict';
import { resolveBannerLink } from './link.js';

const siteOrigin = 'https://jetour-alpha.ru';

assert.deepEqual(
	resolveBannerLink({ url: '/special-offers/' }, { siteOrigin }),
	{
		href: '/special-offers/',
		isExternal: false,
		isPopup: false,
		target: undefined,
		rel: undefined,
	},
	'internal path links stay in the same tab'
);

assert.deepEqual(
	resolveBannerLink({ url: 'https://example.com/promo/' }, { siteOrigin }),
	{
		href: 'https://example.com/promo/',
		isExternal: true,
		isPopup: false,
		target: '_blank',
		rel: 'noopener noreferrer',
	},
	'external http links open in a new tab'
);

assert.deepEqual(
	resolveBannerLink({ url: 'https://jetour-alpha.ru/special-offers/?a=1#top' }, { siteOrigin }),
	{
		href: '/special-offers/?a=1#top',
		isExternal: false,
		isPopup: false,
		target: undefined,
		rel: undefined,
	},
	'same-origin absolute links are normalized to local paths'
);

assert.deepEqual(
	resolveBannerLink({ url: '#common-modal' }, { siteOrigin }),
	{
		href: '#common-modal',
		isExternal: false,
		isPopup: true,
		target: undefined,
		rel: undefined,
	},
	'modal links stay local and are marked as popup links'
);

assert.equal(resolveBannerLink({}, { siteOrigin }), null, 'banner without url has no link');

console.log('banner link tests passed');
