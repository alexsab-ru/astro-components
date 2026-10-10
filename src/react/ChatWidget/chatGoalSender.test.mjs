import assert from 'node:assert/strict';
import test from 'node:test';
import { createChatGoalSender, getChatMetrikaCounterIds, isChatAnalyticsReady } from './chatGoalSender.js';

test('matches enabled production/development providers without waiting for disabled counters', () => {
	assert.deepEqual(getChatMetrikaCounterIds({ value: [{ id: 101 }, null, { id: '' }] }, true), [101, 94754424]);
	assert.deepEqual(getChatMetrikaCounterIds({ value: [{ id: 0 }] }, true), []);
	assert.deepEqual(getChatMetrikaCounterIds(undefined, true), []);
	assert.deepEqual(getChatMetrikaCounterIds({ value: [{ id: 101 }] }, false), [48905003]);
});

test('readiness requires initialized counters, not just an ym stub', () => {
	assert.equal(isChatAnalyticsReady({ ym() {} }), false);
	assert.equal(isChatAnalyticsReady({ ym() {}, Ya: { _metrika: { getCounters: () => [] } } }), false);
	assert.equal(isChatAnalyticsReady({ ym() {}, Ya: { _metrika: { getCounters: () => [{ id: 1 }] } } }), true);
	assert.equal(isChatAnalyticsReady({ dataLayer: [{ event: 'gtm.js' }] }), true);
});

test('waits for both the site and shared Metrica counters', () => {
	const browser = { ym() {}, Ya: { _metrika: { getCounters: () => [{ id: 101 }] } } };
	assert.equal(isChatAnalyticsReady(browser, [101, 202]), false);
	browser.Ya._metrika.getCounters = () => [{ id: 101 }, { id: 202 }];
	assert.equal(isChatAnalyticsReady(browser, [101, 202]), true);
});

test('retains GA4 and Top.Mail.Ru routes on sites without Metrica', () => {
	assert.equal(isChatAnalyticsReady({ dataLayer: [['config', 'G-EXAMPLE']] }), true);
	assert.equal(isChatAnalyticsReady({ _tmr: [{ type: 'pageView', id: 123 }] }), true);
	assert.equal(isChatAnalyticsReady({ dataLayer: [['config', 'G-EXAMPLE']] }, [101]), false);
});

test('keeps early view and answer goals in order until analytics is ready', async () => {
	let ready = false;
	const sent = [];
	const sender = createChatGoalSender(async () => ({ reachGoal: (...args) => sent.push(args) }), {
		isReady: () => ready, pollMs: 1,
	});
	const params = { definition: 'bot_message_visible_v1' };
	const start = sender('form_chat_start', params);
	params.definition = 'changed-after-enqueue';
	const answer = sender('form_chat_step_1', { id: 'model' });
	await new Promise((resolve) => setTimeout(resolve, 5));
	assert.equal(sent.length, 0);
	ready = true;
	assert.deepEqual(await Promise.all([start, answer]), [true, true]);
	assert.deepEqual(sent, [
		['form_chat_start', { definition: 'bot_message_visible_v1' }],
		['form_chat_step_1', { id: 'model' }],
	]);
});

test('blocked analytics never produces a fake success and reports only a safe code', async () => {
	const errors = [];
	const sender = createChatGoalSender(async () => ({ reachGoal: () => assert.fail('not ready') }), {
		isReady: () => false, timeoutMs: 5, pollMs: 1, onError: (code) => errors.push(code),
	});
	assert.equal(await sender('form_chat_start'), false);
	assert.deepEqual(errors, ['analytics_unavailable']);
});
