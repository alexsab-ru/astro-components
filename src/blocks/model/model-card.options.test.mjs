import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveBrandPlacement } from './model-card.options.js';

test('unspecified and invalid model data preserve the separate brand line', () => {
	assert.equal(resolveBrandPlacement(undefined, {}), 'separate');
	assert.equal(resolveBrandPlacement(undefined, { card: { brandPlacement: 'unknown' } }), 'separate');
});
test('brand/model defaults apply to individual models in a mixed list', () => {
	const models = [{ card: { brandPlacement: 'inline' } }, {}, { card: { brandPlacement: 'inline' } }];
	assert.deepEqual(models.map(model => resolveBrandPlacement(undefined, model)), ['inline', 'separate', 'inline']);
});
test('an explicit component prop overrides model data', () => {
	assert.equal(resolveBrandPlacement('separate', { card: { brandPlacement: 'inline' } }), 'separate');
	assert.equal(resolveBrandPlacement('inline', {}), 'inline');
});
