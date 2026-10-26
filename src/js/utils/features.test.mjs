import assert from 'node:assert/strict';
import {
	getFeatureFlag,
	getHeaderCallbackMode,
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

for (const mode of ['both', 'only_phone', 'only_callback']) {
	assert.equal(getHeaderCallbackMode({features: {header_callback: mode}}), mode);
	assert.equal(getHeaderCallbackMode({header_callback: mode}), mode);
}

assert.equal(getHeaderCallbackMode({}), 'both', 'show both controls by default');
assert.equal(
	getHeaderCallbackMode({features: {header_callback: 'only_phone'}, header_callback: 'both'}),
	'only_phone',
	'nested header mode takes precedence'
);
assert.equal(getHeaderCallbackMode({features: {header_callback: false}}), 'only_phone');
assert.equal(getHeaderCallbackMode({features: {header_callback: true}}), 'only_callback');
assert.equal(getHeaderCallbackMode({features: {header_callback: null}}), 'both');
assert.equal(getHeaderCallbackMode({features: {header_callback: 'unknown'}}), 'both');

console.log('feature flag tests passed');
