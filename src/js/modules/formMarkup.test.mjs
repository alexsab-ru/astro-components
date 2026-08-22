import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const astroFormFiles = [
	'../../pages/import.astro',
	'../../pages/test-drive.astro',
	'../../blocks/forms/callback/Callback.astro',
	'../../blocks/forms/chat/Chat.astro',
	'../../blocks/forms/feedback-form/FeedbackFormFields.astro',
	'../../blocks/forms/online-calculation/OnlineCalculation.astro',
	'../../blocks/forms/quiz-slider/QuizSlider.astro',
	'../../blocks/forms/trade-in-form/TradeInFormFields.astro',
	'../../site-shell/auto-show-modal/AutoShowModal.astro',
	'../../site-shell/modals/Modals.astro',
];

test('shared Astro forms use inline validation instead of native tooltips', async () => {
	for (const relativePath of astroFormFiles) {
		const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
		const formTags = source.match(/<form\b[^>]*>/g) || [];
		assert.ok(formTags.length > 0, `${relativePath} must contain a form`);
		formTags.forEach((formTag) => {
			assert.match(formTag, /\bnovalidate\b/, `${relativePath} form must disable native validation`);
		});
	}
});

test('modal forms have unique semantic analytics IDs', async () => {
	const commonModal = await readFile(
		new URL('../../site-shell/modals/Modals.astro', import.meta.url),
		'utf8',
	);
	const autoShowModal = await readFile(
		new URL('../../site-shell/auto-show-modal/AutoShowModal.astro', import.meta.url),
		'utf8',
	);

	assert.match(commonModal, /id="common-modal-form"/);
	assert.match(autoShowModal, /id="auto-show-modal-form"/);
	assert.doesNotMatch(`${commonModal}\n${autoShowModal}`, /rating-form/);
});

test('callback consent error is rendered before the submit button', async () => {
	const source = await readFile(
		new URL('../../blocks/forms/callback/Callback.astro', import.meta.url),
		'utf8',
	);

	assert.ok(source.indexOf('<Checkbox') < source.indexOf('<Button view="form-button"'));
});
