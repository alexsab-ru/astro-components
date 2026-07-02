import assert from 'node:assert/strict';
import {
	getFeatureFlag,
	isCreditEnabled,
	isHeaderTransparentEnabled,
} from './features.js';

assert.equal(
	getFeatureFlag({features: {credit: false}}, 'credit', true),
	false,
	'nested feature flag overrides the default'
);

assert.equal(
	getFeatureFlag({is_header_transparent: true}, 'is_header_transparent', false),
	true,
	'top-level setting remains a fallback for migrated flags'
);

assert.equal(
	isCreditEnabled({features: {credit: false}}),
	false,
	'credit feature can be disabled per site'
);

assert.equal(
	isCreditEnabled({}),
	true,
	'credit feature stays enabled by default'
);

assert.equal(
	isHeaderTransparentEnabled({features: {is_header_transparent: true}}),
	true,
	'header transparent feature reads from nested settings'
);

assert.equal(
	isHeaderTransparentEnabled({}),
	false,
	'header transparent feature stays disabled by default'
);

console.log('feature flag tests passed');
