import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('./formSelect.js', import.meta.url), 'utf8');
const { formSelect } = await import(
	`data:text/javascript;base64,${Buffer.from(
		source.replace(
			"import Alpine from 'alpinejs';",
			'const Alpine = { data(_name, factory) { globalThis.__formSelectFactory = factory; } };',
		)
	).toString('base64')}`
);
formSelect();
const createComponent = globalThis.__formSelectFactory;
delete globalThis.__formSelectFactory;

const dealers = [
	{ id: 0, name: 'Первый ДЦ', ctModId: 'mod-1', ctSiteId: 'site-1', ctRouteKey: 'route-1' },
	{ id: 1, name: 'Второй ДЦ', ctModId: 'mod-2', ctSiteId: 'site-2', ctRouteKey: 'route-2' },
];

function fixture(options = dealers, config = {}) {
	const form = {};
	const pending = [];
	const errorClasses = new Set();
	const component = createComponent({ options, ...config });
	Object.assign(component, {
		$el: { closest: () => form },
		$refs: {
			selectInput: { name: 'dealer', dataset: {} },
			error: { classList: { add: (name) => errorClasses.add(name) } },
		},
		$store: { salonsStore: { filteredData: options } },
		$nextTick: (callback) => pending.push(callback),
	});
	return { component, form, pending, errorClasses };
}

test('form reset clears the dealer caption, open list, error and Calltouch routing', () => {
	const { component, form, pending, errorClasses } = fixture(dealers, { modalData: true });
	component.select(0);
	component.open = true;

	component.onFormReset({ target: form });
	assert.equal(component.value, 'Первый ДЦ', 'wait for the native form reset');
	pending.shift()();

	assert.equal(component.value, null);
	assert.deepEqual(component.currentOption, {});
	assert.equal(component.open, false);
	assert.equal(component.disabled, false);
	assert.equal(errorClasses.has('hidden'), true);
	assert.deepEqual(component.$refs.selectInput.dataset, {
		ctModId: '', ctSiteId: '', ctRouteKey: '',
	});

	// После повторного открытия можно сразу выбрать тот же ДЦ.
	component.select(0);
	assert.equal(component.value, 'Первый ДЦ');
	assert.equal(component.$refs.selectInput.dataset.ctRouteKey, 'route-1');
});

test('reset keeps the automatic dealer selection when filtering leaves one dealer', () => {
	const { component, form, pending } = fixture([dealers[1]], { modalData: true });
	component.effect();
	assert.equal(component.disabled, true);

	component.onFormReset({ target: form });
	pending.shift()();

	assert.equal(component.value, 'Второй ДЦ');
	assert.equal(component.disabled, true);
	assert.equal(component.$refs.selectInput.dataset.ctRouteKey, 'route-2');
});

test('reset does not change selects in other forms or a cancelled reset', () => {
	const { component, form, pending } = fixture();
	component.select(0);
	component.onFormReset({ target: {} });
	assert.equal(pending.length, 0);

	component.onFormReset({ target: form, defaultPrevented: true });
	pending.shift()();
	assert.equal(component.value, 'Первый ДЦ');
});

test('dealer preselection updates the caption and Calltouch and remains editable', () => {
	const { component } = fixture();
	const event = { target: { contains: (element) => element === component.$el }, detail: { name: 'Второй ДЦ' } };
	component.selectDealer(event);
	assert.equal(component.value, 'Второй ДЦ');
	assert.equal(component.disabled, false);
	assert.equal(component.$refs.selectInput.dataset.ctRouteKey, 'route-2');
	assert.equal(component.$refs.selectInput.dataset.ctModId, 'mod-2');
	assert.equal(component.$refs.selectInput.dataset.ctSiteId, 'site-2');

	component.select(0);
	assert.equal(component.value, 'Первый ДЦ');
	assert.equal(component.$refs.selectInput.dataset.ctRouteKey, 'route-1');
});

test('dealer preselection ignores other modals, other field types and unknown dealers', () => {
	const { component } = fixture();
	const event = { target: { contains: () => false }, detail: { name: 'Второй ДЦ' } };
	component.selectDealer(event);
	assert.equal(component.value, null);

	event.target.contains = () => true;
	component.$refs.selectInput.name = 'model';
	component.selectDealer(event);
	assert.equal(component.value, null);

	component.$refs.selectInput.name = 'dealer';
	event.detail.name = 'Неизвестный ДЦ';
	component.selectDealer(event);
	assert.equal(component.value, null);
});
