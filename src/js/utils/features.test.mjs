import assert from 'node:assert/strict';
import {
	getFeatureFlag,
	isHeaderTransparentEnabled,
} from './features.js';

assert.equal(
	getFeatureFlag({is_header_transparent: true}, 'is_header_transparent', false),
	true,
	'top-level setting remains a fallback for migrated flags'
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
