import assert from 'node:assert/strict';
import test from 'node:test';
import {
	CALLBACK_LEAD_CATEGORY,
	getCalltouchGoalPayload,
	isCalltouchCallbackCreated,
	shouldSendCalltouchLead,
} from './calltouchLeadDecision.js';

const leadPayload = {
	eventCategory: 'Lead',
	eventProperties: { phone: '+7 900 000-00-00' },
};

// Подавление Lead API меняет только категорию: остальные поля обязаны доехать
// до GA4, Метрики и GTM.
const suppressed = {
	...leadPayload,
	eventCategory: CALLBACK_LEAD_CATEGORY,
};

test('client callback success suppresses Lead API for a legacy PHP response', () => {
	const clientResult = { status: 'success' };

	assert.equal(isCalltouchCallbackCreated({}, clientResult), true);
	assert.equal(shouldSendCalltouchLead({}, clientResult), false);
	assert.deepEqual(getCalltouchGoalPayload({}, clientResult, leadPayload), suppressed);
});

test('server response cannot override a confirmed client callback success', () => {
	const response = {
		calltouch_callback: {
			status: 'not_attempted',
			source: 'none',
		},
	};

	assert.equal(
		shouldSendCalltouchLead(response, { status: 'success' }),
		false
	);
});

test('server callback success suppresses Lead API after a technical client failure', () => {
	const response = {
		calltouch_callback: {
			status: 'server_success',
			source: 'server',
		},
	};
	const clientResult = { status: 'technical_failure' };

	assert.equal(isCalltouchCallbackCreated(response, clientResult), true);
	assert.equal(shouldSendCalltouchLead(response, clientResult), false);
});

test('failed, rejected and missing callbacks keep one Lead payload', () => {
	for (const scenario of [
		{
			response: { calltouch_callback: { status: 'failed' } },
			clientResult: { status: 'technical_failure' },
		},
		{
			response: { calltouch_callback: { status: 'not_attempted' } },
			clientResult: { status: 'rejected' },
		},
		{
			response: {},
			clientResult: { status: 'not_configured' },
		},
	]) {
		assert.equal(
			shouldSendCalltouchLead(scenario.response, scenario.clientResult),
			true
		);
		assert.equal(
			getCalltouchGoalPayload(
				scenario.response,
				scenario.clientResult,
				leadPayload
			),
			leadPayload
		);
	}
});

test('attention always suppresses Lead API, including a test phone', () => {
	const response = {
		attention: true,
		calltouch_callback: { status: 'failed' },
	};

	assert.equal(
		shouldSendCalltouchLead(response, { status: 'technical_failure' }),
		false
	);
	assert.deepEqual(
		getCalltouchGoalPayload(
			response,
			{ status: 'technical_failure' },
			leadPayload
		),
		suppressed
	);
});

test('suppression swaps only the category and never mutates the source', () => {
	const payload = getCalltouchGoalPayload({}, { status: 'success' }, leadPayload);

	assert.equal(payload.eventCategory, CALLBACK_LEAD_CATEGORY);
	assert.notEqual(payload.eventCategory, 'Lead');
	assert.deepEqual(payload.eventProperties, leadPayload.eventProperties);
	assert.equal(leadPayload.eventCategory, 'Lead');
});
