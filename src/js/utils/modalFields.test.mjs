import assert from 'node:assert/strict';
import test from 'node:test';
import { syncModalFields, syncModalHeadings } from './modalFields.js';

function fixture(formValue = 'Original form', commentValue = 'Original comment') {
	const hidden = initial => ({
		defaultValue: initial,
		get value() { return this.defaultValue; },
		set value(value) { this.defaultValue = value; },
	});
	const form = hidden(formValue);
	const comment = hidden(commentValue);
	return { form, comment, querySelector: selector => selector.includes('"form"') ? form : comment };
}

test('a later card without metadata restores original values, including hidden inputs', () => {
	const modal = fixture();
	syncModalFields(modal, { form_name: 'Card A', comment: 'Comment A' });
	assert.equal(modal.form.value, 'Card A');
	assert.equal(modal.comment.value, 'Comment A');
	syncModalFields(modal, {});
	assert.equal(modal.form.value, 'Original form');
	assert.equal(modal.comment.value, 'Original comment');
	syncModalFields(modal, { form_name: 'Card B' });
	assert.equal(modal.form.value, 'Card B');
	assert.equal(modal.comment.value, 'Original comment');
});

test('custom titles are restored after trigger metadata instead of becoming a generic form', () => {
	const title = { innerHTML: 'Свой заголовок' };
	const subtitle = { innerHTML: 'Своё описание' };
	const modal = { querySelector: selector => selector === '.title' ? title : subtitle };
	syncModalHeadings(modal, { title: 'Другой <br>заголовок', subtitle: 'Другая подпись' });
	assert.equal(title.innerHTML, 'Другой <br>заголовок');
	syncModalHeadings(modal);
	assert.equal(title.innerHTML, 'Свой заголовок');
	assert.equal(subtitle.innerHTML, 'Своё описание');
});

test('an explicit empty value clears a field without replacing its saved default', () => {
	const modal = fixture();
	syncModalFields(modal, { form_name: '', comment: '' });
	assert.equal(modal.form.value, '');
	assert.equal(modal.comment.value, '');
	syncModalFields(modal);
	assert.equal(modal.form.value, 'Original form');
	assert.equal(modal.comment.value, 'Original comment');
});

test('separate dialogs keep separate defaults and optional fields stay optional', () => {
	const first = fixture('First');
	const second = fixture('Second');
	syncModalFields(first, { form_name: 'Custom' });
	syncModalFields(second, { form_name: 'Custom' });
	syncModalFields(first);
	syncModalFields(second);
	assert.equal(first.form.value, 'First');
	assert.equal(second.form.value, 'Second');
	assert.doesNotThrow(() => syncModalFields({ querySelector: () => null }, {}));
});
