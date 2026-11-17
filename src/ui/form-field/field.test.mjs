import assert from 'node:assert/strict';
import test from 'node:test';
import { fieldAccessibility } from './field.js';

test('repeated required fields get independent associations', () => {
	const first = fieldAccessibility({ required: true });
	const second = fieldAccessibility({ required: true });
	assert.notEqual(first.id, second.id);
	assert.equal(first.describedBy, undefined);
	assert.equal(first.errorMessage, `${first.id}-error`);
	assert.equal(second.errorMessage, `${second.id}-error`);
});

test('explicit ID and existing descriptions are preserved and deduplicated', () => {
	assert.deepEqual(fieldAccessibility({
		id: 'comment', label: 'Комментарий', hint: 'Подсказка', required: true,
		describedBy: 'external  comment-hint\nexternal',
	}), { id: 'comment', describedBy: 'external comment-hint', errorMessage: 'comment-error' });
});

test('optional controls do not acquire error references or unnecessary IDs', () => {
	assert.deepEqual(fieldAccessibility({}), { id: undefined, describedBy: undefined, errorMessage: undefined });
	assert.deepEqual(fieldAccessibility({ id: 'optional', hint: 'Подсказка' }), {
		id: 'optional', describedBy: 'optional-hint', errorMessage: undefined,
	});
});
