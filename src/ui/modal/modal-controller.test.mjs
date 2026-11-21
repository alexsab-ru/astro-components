import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';

const environment = new JSDOM('');
globalThis.Element = environment.window.Element;
globalThis.HTMLElement = environment.window.HTMLElement;
globalThis.Document = environment.window.Document;
globalThis.MutationObserver = environment.window.MutationObserver;
globalThis.getComputedStyle = (node) =>
	node.ownerDocument.defaultView.getComputedStyle(node);
const { initModals, openModal, closeModal } =
	await import('./modal-controller.js');
const { confirmFileRemoval } =
	await import('../../js/utils/confirmFileRemoval.js');
const { initModalForms } =
	await import('../../site-shell/modals/modal-form-context.js');
const tick = async () => {
	// Flush visibility observers before their deferred initial-focus task.
	await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
};
const shell = (id) =>
	`<div id="${id}" class="modal-overlay hidden" data-close><div class="modal-content" tabindex="-1"><button type="button" data-close><svg data-close><path data-close /></svg></button><input name="name"><p class="message"></p><button type="button" id="dropzone-accept">Accept</button><button type="button" id="dropzone-cancel">Cancel</button></div></div>`;

function fixture(markup = shell('one')) {
	const dom = new JSDOM(
		`<style>.hidden{display:none}</style><button id="trigger">Open</button>${markup}`,
		{ pretendToBeVisual: true, url: 'https://example.test/' }
	);
	const doc = dom.window.document;
	const controller = initModals(doc);
	return {
		doc,
		controller,
		dispose() {
			controller.destroy();
			dom.window.close();
		},
	};
}

test('initialization is shared, repeated opens do not duplicate lifecycle events', async () => {
	const f = fixture();
	try {
		const modal = f.doc.getElementById('one');
		let opens = 0,
			closes = 0;
		modal.addEventListener('modal:open', () => opens++);
		modal.addEventListener('modal:close', () => closes++);
		assert.equal(initModals(f.doc), f.controller);
		assert.equal(openModal(modal), true);
		assert.equal(openModal(modal), false);
		await tick();
		assert.equal(opens, 1);
		assert.equal(f.doc.body.classList.contains('overflow-hidden'), true);
		assert.equal(modal.contains(f.doc.activeElement), true);
		assert.equal(closeModal(modal), true);
		assert.equal(closeModal(modal), false);
		assert.equal(closes, 1);
	} finally {
		f.dispose();
	}
});

test('new triggers work after initialization and return focus after close', async () => {
	const f = fixture();
	try {
		const link = f.doc.createElement('a');
		link.href = '#one';
		link.className = 'popup-link';
		link.innerHTML = '<span>Open</span>';
		f.doc.body.prepend(link);
		link.focus();
		let trigger;
		f.doc
			.getElementById('one')
			.addEventListener('modal:beforeopen', (e) => {
				trigger = e.detail.trigger;
			});
		link.querySelector('span').click();
		await tick();
		assert.equal(trigger, link);
		const modal = f.doc.getElementById('one');
		modal.querySelector('input').click();
		assert.equal(modal.classList.contains('hidden'), false);
		modal
			.querySelector('path')
			.dispatchEvent(
				new f.doc.defaultView.MouseEvent('click', { bubbles: true })
			);
		assert.equal(modal.classList.contains('hidden'), true);
		assert.equal(f.doc.activeElement, link);
	} finally {
		f.dispose();
	}
});

test('Escape closes the last opened window, keeping the underlying window locked', async () => {
	const f = fixture(shell('one') + shell('two'));
	try {
		openModal(f.doc.getElementById('one'));
		openModal(f.doc.getElementById('two'));
		await tick();
		f.doc.dispatchEvent(
			new f.doc.defaultView.KeyboardEvent('keydown', {
				key: 'Escape',
				bubbles: true,
			})
		);
		assert.equal(
			f.doc.getElementById('two').classList.contains('hidden'),
			true
		);
		assert.equal(
			f.doc.getElementById('one').classList.contains('hidden'),
			false
		);
		assert.equal(f.doc.body.classList.contains('overflow-hidden'), true);
		f.doc.getElementById('one').click();
		assert.equal(f.doc.body.classList.contains('overflow-hidden'), false);
	} finally {
		f.dispose();
	}
});

test('SDK visibility changes synchronize focus and scrolling without duplicated handlers', async () => {
	const f = fixture();
	try {
		const modal = f.doc.getElementById('one');
		modal.classList.remove('hidden');
		await tick();
		assert.equal(f.doc.body.classList.contains('overflow-hidden'), true);
		assert.equal(modal.contains(f.doc.activeElement), true);
		modal.classList.add('hidden');
		await tick();
		assert.equal(f.doc.body.classList.contains('overflow-hidden'), false);
	} finally {
		f.dispose();
	}
});

test('an earlier SDK confirmation is layered over a later custom window', async () => {
	const f = fixture(shell('confirm-modal') + shell('custom-window'));
	try {
		const custom = f.doc.getElementById('custom-window');
		const confirmation = f.doc.getElementById('confirm-modal');
		openModal(custom);
		confirmation.classList.remove('hidden');
		await tick();
		assert.ok(
			Number(confirmation.style.zIndex) > Number(custom.style.zIndex)
		);
		closeModal(confirmation);
		assert.equal(custom.classList.contains('hidden'), false);
		assert.equal(f.doc.body.classList.contains('overflow-hidden'), true);
		assert.equal(confirmation.style.zIndex, '');
	} finally {
		f.dispose();
	}
});

test('pre-existing page scroll lock is preserved and missing targets are harmless', () => {
	const f = fixture();
	try {
		f.doc.body.classList.add('overflow-hidden');
		openModal(f.doc.getElementById('one'));
		closeModal(f.doc.getElementById('one'));
		assert.equal(f.doc.body.classList.contains('overflow-hidden'), true);
		assert.equal(openModal(null), false);
		assert.equal(closeModal(null), false);
	} finally {
		f.dispose();
	}
});

test('file confirmation accepts once and cancellation cannot leak into a later file', () => {
	const f = fixture(shell('dropzone-confirm-modal'));
	try {
		let accepted = 0,
			rejected = 0;
		confirmFileRemoval(
			'First file?',
			() => accepted++,
			() => rejected++,
			f.doc
		);
		f.doc.getElementById('dropzone-cancel').click();
		assert.deepEqual([accepted, rejected], [0, 1]);
		confirmFileRemoval(
			'Second file?',
			() => accepted++,
			() => rejected++,
			f.doc
		);
		f.doc.getElementById('dropzone-accept').click();
		f.doc.getElementById('dropzone-accept').click();
		assert.deepEqual([accepted, rejected], [1, 1]);
	} finally {
		f.dispose();
	}
});

test('Escape, close icon and backdrop reject file deletion and clean callbacks', () => {
	for (const method of ['escape', 'close', 'backdrop']) {
		const f = fixture(shell('dropzone-confirm-modal'));
		try {
			let accepted = 0,
				rejected = 0;
			confirmFileRemoval(
				'Keep this file?',
				() => accepted++,
				() => rejected++,
				f.doc
			);
			if (method === 'escape')
				f.doc.dispatchEvent(
					new f.doc.defaultView.KeyboardEvent('keydown', {
						key: 'Escape',
					})
				);
			if (method === 'close')
				f.doc.querySelector('[data-close] button').click();
			if (method === 'backdrop')
				f.doc.getElementById('dropzone-confirm-modal').click();
			f.doc.getElementById('dropzone-accept').click();
			assert.deepEqual([accepted, rejected], [0, 1], method);
		} finally {
			f.dispose();
		}
	}
});

test('replacing a pending file decision rejects the old callback before the new one', () => {
	const f = fixture(shell('dropzone-confirm-modal'));
	try {
		const calls = [];
		confirmFileRemoval(
			'Old?',
			() => calls.push('old accept'),
			() => calls.push('old reject'),
			f.doc
		);
		confirmFileRemoval(
			'New?',
			() => calls.push('new accept'),
			() => calls.push('new reject'),
			f.doc
		);
		f.doc.getElementById('dropzone-accept').click();
		assert.deepEqual(calls, ['old reject', 'new accept']);
	} finally {
		f.dispose();
	}
});

test('lead metadata, departments and close/reset goals stay local to the opened form', async () => {
	const markup = `<p class="error-message" id="outside-error">Other form error</p><a href="#one" class="popup-link" id="lead-trigger" data-title="Offer A" data-form_name="Offer A" data-comment="Comment A" data-choose_department="true">Open</a><div id="one" class="modal-overlay hidden" data-close><div class="modal-content" tabindex="-1"><button data-close>Close</button><p class="title">Original title</p><p class="subtitle">Original subtitle</p><form><input name="form" type="hidden" value="Default form"><input name="comment" type="hidden"><input name="name"><input name="departament" type="hidden" value="Сервис" data-departament-default disabled><div data-departament-block><input name="departament" type="radio" value="Отдел продаж"><input name="departament" type="radio" value="Сервис"></div><p class="error-message">Local error</p></form></div></div>`;
	const f = fixture(markup);
	const goals = [];
	const binding = initModalForms(f.doc, (goal) => goals.push(goal));
	try {
		assert.equal(initModalForms(f.doc), binding);
		const modal = f.doc.getElementById('one');
		const link = f.doc.getElementById('lead-trigger');
		link.click();
		await tick();
		assert.equal(modal.querySelector('.title').innerHTML, 'Offer A');
		assert.equal(
			modal.querySelector('[name="comment"]').value,
			'Comment A'
		);
		assert.equal(
			modal.querySelector('[data-departament-default]').disabled,
			true
		);
		assert.equal(modal.querySelector('[type="radio"]').disabled, false);
		modal.querySelector('[name="name"]').value = 'Local draft';
		modal.querySelector('[data-close]').click();
		assert.equal(modal.querySelector('[name="name"]').value, '');
		assert.equal(
			f.doc.getElementById('outside-error').classList.contains('hidden'),
			false
		);
		link.removeAttribute('data-comment');
		link.removeAttribute('data-choose_department');
		link.removeAttribute('data-title');
		link.click();
		assert.equal(modal.querySelector('.title').innerHTML, 'Original title');
		assert.equal(modal.querySelector('[name="comment"]').value, '');
		assert.equal(
			modal.querySelector('[data-departament-default]').disabled,
			false
		);
		assert.equal(modal.querySelector('[type="radio"]').disabled, true);
		assert.deepEqual(goals, ['form_open', 'form_close', 'form_open']);
	} finally {
		binding.destroy();
		f.dispose();
	}
});

test('optional image hooks do not throw on ordinary windows or retain the previous side', () => {
	const f = fixture(
		shell('one') +
			`<div id="two" class="modal-overlay hidden"><div class="modal-content"><p class="title">Image</p><div class="modal-grid-content"><div class="left hidden"></div><div class="right hidden"></div></div></div></div>`
	);
	const binding = initModalForms(f.doc);
	try {
		const trigger = f.doc.createElement('a');
		trigger.dataset.img = '/demo.webp';
		trigger.dataset.img_position = 'left';
		assert.doesNotThrow(() =>
			openModal(f.doc.getElementById('one'), trigger)
		);
		const modal = f.doc.getElementById('two');
		openModal(modal, trigger);
		assert.equal(modal.querySelectorAll('.left img').length, 1);
		closeModal(modal);
		trigger.dataset.img_position = 'right';
		openModal(modal, trigger);
		assert.equal(modal.querySelectorAll('.left img').length, 0);
		assert.equal(modal.querySelectorAll('.right img').length, 1);
	} finally {
		binding.destroy();
		f.dispose();
	}
});
