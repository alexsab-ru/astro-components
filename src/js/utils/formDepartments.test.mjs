import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveFormDepartments, syncFormDepartments } from './formDepartments.js';

test('missing configuration preserves sales and service; a service-only site has one department', () => {
	assert.deepEqual(resolveFormDepartments(), ['Отдел продаж', 'Сервис']);
	assert.deepEqual(resolveFormDepartments(['Сервис']), ['Сервис']);
});

test('normalizes names while preserving the configured default and rejects empty choices', () => {
	assert.deepEqual(resolveFormDepartments([' Сервис ', 'Сервис', 'Отдел продаж']), ['Сервис', 'Отдел продаж']);
	for (const value of [null, [], '', [''], ['Сервис', false]]) {
		assert.throws(() => resolveFormDepartments(value), /form_departments/);
	}
});

test('opening successive forms switches between selectable radios and a submitted default', () => {
	const fallback = { value: 'Отдел продаж', disabled: true };
	const radios = [
		{ value: 'Отдел продаж', checked: false, disabled: false },
		{ value: 'Сервис', checked: true, disabled: false },
	];
	let hidden = false;
	const block = { classList: { toggle: (_, value) => { hidden = value; } } };
	const modal = {
		querySelector: (selector) => selector === '[data-departament-block]' ? block : fallback,
		querySelectorAll: () => radios,
	};
	syncFormDepartments(modal, undefined);
	assert.equal(hidden, true);
	assert.equal(fallback.disabled, false);
	assert.ok(radios.every((radio) => radio.disabled && !radio.checked));
	syncFormDepartments(modal, 'true');
	assert.equal(hidden, false);
	assert.equal(fallback.disabled, true);
	assert.ok(radios.every((radio) => !radio.disabled));
	// A service-only form has no choice block: its hidden value stays enabled.
	syncFormDepartments({ querySelector: () => null }, 'true');
});
