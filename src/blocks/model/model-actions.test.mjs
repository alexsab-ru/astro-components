import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveModelActions } from './model-actions.js';
const model = {
	id: 'a1',
	status: 'enable',
	brand: { id: 'demo', displayName: 'Демо' },
	name: 'A1',
	complectations: [{}],
};
const ids = (options) =>
	resolveModelActions(model, { status: 'enable', testDriveModels: [model], ...options }).map(
		(b) => b.id
	);
test('default set and metadata preserve existing model actions', () => {
	assert.deepEqual(ids(), [
		'buy',
		'credit',
		'testDrive',
		'offer',
		'configuration',
	]);
	const buttons = resolveModelActions(model, { status: 'enable' });
	assert.equal(buttons[0].action.title, 'Купить Демо');
	assert.equal(buttons[0].action.formName, 'Купить. Демо A1');
	assert.equal(buttons.at(-1).action.url, '#complectation');
});
test('credit and test drive can be disabled separately or excluded from any set', () => {
	assert.deepEqual(ids({ creditEnabled: false, testDriveEnabled: false }), [
		'buy',
		'offer',
		'configuration',
	]);
	assert.deepEqual(ids({ excludeActions: ['buy', 'testDrive', 'credit'] }), [
		'offer',
		'configuration',
	]);
});
test('presets and explicit lists select exactly the requested order', () => {
	assert.deepEqual(ids({ preset: 'purchase' }), [
		'buy',
		'offer',
		'configuration',
	]);
	assert.deepEqual(ids({ preset: 'contact' }), ['offer']);
	assert.deepEqual(ids({ actions: ['configuration', 'buy'] }), [
		'configuration',
		'buy',
	]);
	assert.deepEqual(ids({ actions: [] }), []);
});
test('custom buttons are independent, inputs are not mutated and flags still filter builtins', () => {
	const custom = {
		title: 'Свой раздел',
		action: { type: 'link', url: '/custom/' },
	};
	const actions = ['credit', custom, 'offer'];
	const before = JSON.stringify(actions);
	assert.deepEqual(
		resolveModelActions(model, {
			status: 'enable',
			actions,
			creditEnabled: false,
		}).map((b) => b.title),
		['Свой раздел', 'Узнать цену по акции']
	);
	assert.equal(JSON.stringify(actions), before);
});
test('model status/show and missing configuration fallback retain previous behavior', () => {
	assert.deepEqual(resolveModelActions(model, { status: 'preorder' }), []);
	assert.equal(
		resolveModelActions({ ...model, show: true }, { status: 'preorder' })
			.length,
		4
	);
	assert.equal(
		resolveModelActions(
			{ ...model, complectations: [] },
			{ status: 'enable' }
		).at(-1).action.type,
		'popup'
	);
});

test('test-drive actions require this brand and model in the matrix, even with an explicit enable', () => {
	assert.ok(!ids({ testDriveModels: [] }).includes('testDrive'));
	assert.ok(!ids({ testDriveModels: [], testDriveEnabled: true }).includes('testDrive'));
	assert.ok(!ids({ testDriveModels: [{ ...model, brand: { id: 'other' } }] }).includes('testDrive'));
	assert.deepEqual(ids({ testDriveModels: [], actions: ['buy', 'testDrive', 'offer'] }), ['buy', 'offer']);
	assert.ok(ids({ testDriveModels: [model] }).includes('testDrive'));
});
