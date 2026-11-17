import assert from 'node:assert/strict';
import test from 'node:test';
import { resetFieldErrors } from './field-reset.js';

function control(hasError = true) {
	const attrs = { 'aria-invalid': 'true' };
	const hidden = new Set();
	return {
		attrs, hidden, customValidity: 'invalid',
		removeAttribute(name) { delete attrs[name]; },
		setCustomValidity(value) { this.customValidity = value; },
		parentElement: { querySelector: () => hasError ? { classList: { add: value => hidden.add(value) } } : null },
	};
}

test('reset clears invalid state/custom validity and error visibility in its form only', () => {
	const first = control();
	const second = control();
	resetFieldErrors({ querySelectorAll: () => [first] });
	assert.equal(first.attrs['aria-invalid'], undefined);
	assert.equal(first.customValidity, '');
	assert.equal(first.hidden.has('hidden'), true);
	assert.equal(second.attrs['aria-invalid'], 'true');
	assert.equal(second.customValidity, 'invalid');
	assert.equal(second.hidden.size, 0);
});

test('optional field without an error is reset without throwing', () => {
	const optional = control(false);
	assert.doesNotThrow(() => resetFieldErrors({ querySelectorAll: () => [optional] }));
	assert.equal(optional.customValidity, '');
});
