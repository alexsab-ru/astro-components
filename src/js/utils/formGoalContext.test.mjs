import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const toModuleUrl = (source) =>
	`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;

const source = await readFile(new URL('./formGoalContext.js', import.meta.url), 'utf8');
const analyticsMockUrl = toModuleUrl(`
	export const reachGoal = (goal, payload) => {
		globalThis.__formGoalCalls.push({ goal, payload });
	};
`);
const instrumentedSource = source.replace(
	"from '@alexsab-ru/scripts'",
	`from ${JSON.stringify(analyticsMockUrl)}`,
);
const { emitFormRequired, getFormRequiredGoalPayload } = await import(
	toModuleUrl(instrumentedSource)
);

test('form_required context contains field names but never field values', () => {
	const payload = getFormRequiredGoalPayload({
		formID: 'callback-form',
		invalidFields: ['.phone', 'email', 'phone', '+7 900 000-00-00'],
	});

	assert.deepEqual(payload, {
		eventProperties: {
			validationSource: 'client',
			formID: 'callback-form',
			invalidFields: 'phone,email',
			invalidCount: 2,
		},
	});
});

test('emitFormRequired emits one categorized goal', () => {
	globalThis.__formGoalCalls = [];

	emitFormRequired({
		formID: 'callback-form',
		validationSource: 'server',
		invalidFields: ['.dealer'],
	});

	assert.deepEqual(globalThis.__formGoalCalls, [{
		goal: 'form_required',
		payload: {
			eventProperties: {
				validationSource: 'server',
				formID: 'callback-form',
				invalidFields: 'dealer',
				invalidCount: 1,
			},
		},
	}]);
	delete globalThis.__formGoalCalls;
});
