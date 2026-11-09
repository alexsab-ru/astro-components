import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const toModuleUrl = (source) =>
	`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;

let moduleLoadId = 0;

class FakeClassList {
	constructor(classes = []) {
		this.classes = new Set(classes);
	}

	add(name) {
		this.classes.add(name);
	}

	remove(name) {
		this.classes.delete(name);
	}

	contains(name) {
		return this.classes.has(name);
	}
}

const createModal = ({ open = false, form = false } = {}) => {
	const listeners = {};
	const formElement = form ? { resetCalls: 0, reset() { this.resetCalls += 1; } } : null;

	return {
		classList: new FakeClassList(open ? [] : ['hidden']),
		formElement,
		listeners,
		events: [],
		dispatchEvent(event) {
			this.events.push(event);
		},
		addEventListener(event, callback) {
			listeners[event] = callback;
		},
		querySelector(selector) {
			return selector === 'form' ? formElement : null;
		},
		querySelectorAll() {
			return [];
		},
	};
};

const createLink = (href = '#common-modal') => ({
	dataset: {},
	getAttribute(name) {
		return name === 'href' ? href : null;
	},
	onclick: null,
});

const loadModals = async (modals, links = []) => {
	const documentListeners = {};
	globalThis.__modalGoals = [];
	globalThis.document = {
		body: { classList: new FakeClassList(['overflow-hidden']) },
		documentElement: { dataset: {} },
		location: { search: '' },
		addEventListener(event, callback) {
			documentListeners[event] = callback;
		},
		getElementById(id) {
			return id === 'common-modal' ? modals[0] : null;
		},
		querySelectorAll(selector) {
			if (selector === '.popup-link') return links;
			if (selector === '.error-message') return [];
			if (selector === '.modal-overlay') return modals;
			return [];
		},
	};
	globalThis.window = { location: { search: '' } };
	const pending = [];
	const store = {
		sortingCalls: [],
		sortingData(brand) { this.sortingCalls.push(brand); },
	};
	globalThis.Alpine = { nextTick: (callback) => pending.push(callback), store: () => store };
	documentListeners.flushAlpine = () => { while (pending.length) pending.shift()(); };
	documentListeners.salonsStore = store;

	const source = await readFile(new URL('./modals.js', import.meta.url), 'utf8');
	const analyticsMockUrl = toModuleUrl(`
		export const reachGoal = (goal) => globalThis.__modalGoals.push(goal);
	`);
	const instrumentedSource = source.replace(
		"from '@alexsab-ru/scripts'",
		`from ${JSON.stringify(analyticsMockUrl)}`,
	).replace(
		"from '../utils/formDepartments'",
		`from ${JSON.stringify(new URL('../utils/formDepartments.js', import.meta.url).href)}`,
	);
	moduleLoadId += 1;
	await import(toModuleUrl(`${instrumentedSource}\n// test-load-${moduleLoadId}`));

	return documentListeners;
};

test('Escape with no open modal does not emit form_close', async () => {
	const modals = Array.from({ length: 4 }, () => createModal());
	const listeners = await loadModals(modals);

	listeners.keydown({ key: 'Escape' });

	assert.deepEqual(globalThis.__modalGoals, []);
});

test('opening a hidden form modal emits form_open once', async () => {
	const formModal = createModal({ form: true });
	const link = createLink();
	await loadModals([formModal], [link]);

	link.onclick({ preventDefault() {} });
	link.onclick({ preventDefault() {} });

	assert.deepEqual(globalThis.__modalGoals, ['form_open']);
	assert.equal(formModal.classList.contains('hidden'), false);
});

test('opening a non-form modal does not emit form_open', async () => {
	const imageModal = createModal();
	const link = createLink();
	await loadModals([imageModal], [link]);

	link.onclick({ preventDefault() {} });

	assert.deepEqual(globalThis.__modalGoals, []);
	assert.equal(imageModal.classList.contains('hidden'), false);
});

test('Escape closes one open form modal and emits form_close once', async () => {
	const formModal = createModal({ open: true, form: true });
	const modals = [formModal, createModal(), createModal(), createModal()];
	const listeners = await loadModals(modals);

	listeners.keydown({ key: 'Escape' });

	assert.deepEqual(globalThis.__modalGoals, ['form_close']);
	assert.equal(formModal.formElement.resetCalls, 1);
	assert.equal(formModal.classList.contains('hidden'), true);
});

test('Escape closes a non-form modal without emitting form_close', async () => {
	const imageModal = createModal({ open: true });
	const listeners = await loadModals([imageModal]);

	listeners.keydown({ key: 'Escape' });

	assert.deepEqual(globalThis.__modalGoals, []);
	assert.equal(imageModal.classList.contains('hidden'), true);
});

test('close click emits form_close only for a visible form modal', async () => {
	const formModal = createModal({ open: true, form: true });
	const hiddenFormModal = createModal({ form: true });
	await loadModals([formModal, hiddenFormModal]);

	formModal.listeners.click({ target: { dataset: { close: '' } } });
	hiddenFormModal.listeners.click({ target: { dataset: { close: '' } } });

	assert.deepEqual(globalThis.__modalGoals, ['form_close']);
	assert.equal(formModal.formElement.resetCalls, 1);
	assert.equal(hiddenFormModal.formElement.resetCalls, 0);
});

test('dealer callback waits for the sorted options then selects the dealer in its target modal', async () => {
	const formModal = createModal({ form: true });
	const link = createLink();
	link.dataset.dealerName = 'Второй ДЦ';
	const listeners = await loadModals([formModal], [link]);
	globalThis.document.documentElement.dataset.brand = 'haval';

	link.onclick({ preventDefault() {} });
	assert.deepEqual(listeners.salonsStore.sortingCalls, ['haval']);
	assert.equal(formModal.events.length, 0);
	listeners.flushAlpine();
	assert.equal(formModal.events.length, 1);
	assert.equal(formModal.events[0].type, 'select-dealer');
	assert.equal(formModal.events[0].bubbles, true);
	assert.deepEqual(formModal.events[0].detail, { name: 'Второй ДЦ' });
});

test('ordinary callback does not request a dealer preselection', async () => {
	const formModal = createModal({ form: true });
	const link = createLink();
	const listeners = await loadModals([formModal], [link]);
	link.onclick({ preventDefault() {} });
	listeners.flushAlpine();
	assert.deepEqual(formModal.events, []);
});

test.afterEach(() => {
	delete globalThis.__modalGoals;
	delete globalThis.document;
	delete globalThis.window;
	delete globalThis.Alpine;
});
