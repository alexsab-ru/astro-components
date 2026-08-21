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
const {
	emitFormError,
	emitFormRequired,
	getFormErrorGoalPayload,
	getFormRequiredGoalPayload,
	reportClientFormError,
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

test('client form error report is deduplicated and excludes error details', async () => {
	const previousWindow = globalThis.window;
	const previousFetch = globalThis.fetch;
	const stored = new Map();
	const requests = [];
	globalThis.window = {
		location: { pathname: '/cars/?phone=private' },
		sessionStorage: {
			getItem: (key) => stored.get(key) || null,
			setItem: (key, value) => stored.set(key, value),
		},
	};
	globalThis.fetch = async (url, options) => requests.push({ url, options });

	try {
		const context = {
			formID: 'callback-form',
			errorSource: 'network',
			errorStage: 'lead_request',
			error: 'private error details',
		};
		assert.equal(await reportClientFormError(context), true);
		assert.equal(await reportClientFormError(context), false);
		assert.equal(requests.length, 1);
		assert.deepEqual(JSON.parse(requests[0].options.body), {
			version: 1,
			goal: 'form_error',
			errorSource: 'network',
			errorStage: 'lead_request',
			formID: 'callback-form',
			pagePath: '/cars/',
		});
		assert.equal(requests[0].options.body.includes('private'), false);
	} finally {
		globalThis.window = previousWindow;
		globalThis.fetch = previousFetch;
	}
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

	emitFormError({
		formID: 'callback-form',
		errorSource: 'network',
		errorStage: 'lead_request',
	});

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
	delete globalThis.__formGoalCalls;
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
