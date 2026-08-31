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
	export const reportClientFormError = (context) => {
		globalThis.__clientErrorReports.push(context);
		return Promise.resolve(true);
	};
`);
const instrumentedSource = source.replace(
	"from '@alexsab-ru/scripts'",
	`from ${JSON.stringify(analyticsMockUrl)}`,
);
const {
	emitFormError,
	emitFormRequired,
	getFormErrorGoalPayload,
	getFormRequiredGoalPayload,
} = await import(
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

test('form_error context contains only bounded technical categories', () => {
	const payload = getFormErrorGoalPayload({
		formID: 'callback-form',
		errorSource: 'server',
		errorStage: 'lead_response',
		httpStatus: 503,
		error: 'must be ignored',
	});

	assert.deepEqual(payload, {
		eventProperties: {
			errorSource: 'server',
			errorStage: 'lead_response',
			formID: 'callback-form',
			httpStatus: 503,
		},
	});
});

test('emitFormError emits one categorized goal', () => {
	globalThis.__formGoalCalls = [];
	globalThis.__clientErrorReports = [];

	const context = {
		formID: 'callback-form',
		errorSource: 'network',
		errorStage: 'lead_request',
	};
	emitFormError(context);

	assert.deepEqual(globalThis.__formGoalCalls, [{
		goal: 'form_error',
		payload: {
			eventProperties: {
				errorSource: 'network',
				errorStage: 'lead_request',
				formID: 'callback-form',
			},
		},
	}]);
	assert.deepEqual(globalThis.__clientErrorReports, [context]);
	delete globalThis.__formGoalCalls;
	delete globalThis.__clientErrorReports;
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
