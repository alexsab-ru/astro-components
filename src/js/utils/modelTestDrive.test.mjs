import assert from 'node:assert/strict';
import test from 'node:test';
import { getModelFeedbackTitle, isModelTestDriveEnabled } from './modelTestDrive.js';

const model = { id: 'rav4', brand: { id: 'toyota' }, status: 'enable' };

test('empty, absent or invalid test-drive lists disable test drive without using the sales list', () => {
	for (const list of [[], undefined, null, {}]) {
		assert.equal(isModelTestDriveEnabled(model, list), false);
		assert.equal(getModelFeedbackTitle(model, list), 'Получить спецпредложение');
	}
});

test('availability matches both brand and model and respects test-drive model visibility', () => {
	assert.equal(isModelTestDriveEnabled(model, [model]), true);
	assert.equal(getModelFeedbackTitle(model, [model]), 'Записаться на тест-драйв');
	assert.equal(isModelTestDriveEnabled(model, [{ ...model, brand: { id: 'lexus' } }]), false);
	assert.equal(isModelTestDriveEnabled(model, [{ ...model, id: 'camry' }]), false);
	for (const status of ['hide', 'disable']) {
		assert.equal(isModelTestDriveEnabled(model, [{ ...model, status }]), false);
	}
	assert.equal(isModelTestDriveEnabled(model, [{ ...model, status: 'hide', show: true }]), true);
	assert.equal(isModelTestDriveEnabled({}, [model]), false);
});

test('legacy brand fields and formatted model ids work without merging distinct plus models', () => {
	assert.equal(isModelTestDriveEnabled(model, [{ id: 'RAV 4', mark_id: 'TOYOTA', status: 'enable' }]), true);
	assert.equal(isModelTestDriveEnabled({ ...model, id: 'x50' }, [{ ...model, id: 'x50+' }]), false);
});
