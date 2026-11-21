import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const astroFormFiles = [
	'../../pages/import.astro',
	'../../pages/test-drive.astro',
	'../../blocks/forms/lead-form/LeadForm.astro',
	'../../blocks/forms/chat/Chat.astro',
	'../../blocks/forms/quiz-slider/QuizSlider.astro',
	'../../site-shell/auto-show-modal/AutoShowModal.astro',
];

// Scenario forms and modal IDs are checked after rendering by verify-form-demos.py
// and verify-modal-demos.py; their source wrappers no longer contain native forms.
test('native Astro form shells use inline validation instead of native tooltips', async () => {
	for (const relativePath of astroFormFiles) {
		const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
		const formTags = source.match(/<form\b[^>]*>/g) || [];
		assert.ok(formTags.length > 0, `${relativePath} must contain a form`);
		formTags.forEach((formTag) => {
			assert.match(formTag, /\bnovalidate\b/, `${relativePath} form must disable native validation`);
		});
	}
});
