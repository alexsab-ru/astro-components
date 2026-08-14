import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('./RedirectPage.astro', import.meta.url), 'utf8');
const inlineScript = source.match(/<script define:vars=\{\{[^>]+\}\}>([\s\S]*?)<\/script>/)?.[1];

assert.ok(inlineScript, 'RedirectPage inline script was not found');

function createClock() {
	let now = 0;
	let nextId = 1;
	const timers = [];

	return {
		setTimeout(callback, delay = 0) {
			const timer = { id: nextId++, at: now + Number(delay), callback, cancelled: false };
			timers.push(timer);
			return timer.id;
		},
		clearTimeout(id) {
			const timer = timers.find((candidate) => candidate.id === id);
			if (timer) timer.cancelled = true;
		},
		async advanceTo(target) {
			while (true) {
				const timer = timers
					.filter((candidate) => !candidate.cancelled && candidate.at <= target)
					.sort((left, right) => left.at - right.at || left.id - right.id)[0];
				if (!timer) break;
				timer.cancelled = true;
				now = timer.at;
				timer.callback();
				for (let flush = 0; flush < 5; flush += 1) await Promise.resolve();
			}
			now = target;
			for (let flush = 0; flush < 5; flush += 1) await Promise.resolve();
		},
	};
}

async function runRedirectScenario({ fetchImpl, metricCallback = false, advanceTo = 3000, saveUrl = '' }) {
	const clock = createClock();
	const fetchCalls = [];
	const errors = [];
	let redirectCount = 0;
	let href = 'https://haval-ulyanovsk.ru/HavalCityTonAutoBot-telegram-bot/';
	const location = {};
	Object.defineProperty(location, 'href', {
		get: () => href,
		set: (value) => {
			href = value;
			redirectCount += 1;
		},
	});

	const storage = () => ({
		values: new Map(),
		getItem(key) { return this.values.get(key) ?? null; },
		setItem(key, value) { this.values.set(key, String(value)); },
		removeItem(key) { this.values.delete(key); },
	});
	const document = {
		body: { appendChild() {} },
		cookie: '',
		scripts: [],
		createElement: () => ({ click() {}, remove() {} }),
		getElementsByTagName: () => [{ parentNode: { insertBefore() {} } }],
		querySelector: () => ({ innerHTML: '' }),
	};
	const window = { location };
	const ym = (...args) => {
		if (args[1] === 'reachGoal' && metricCallback) args.at(-1)();
	};
	ym.a = [[104681483]];

	vm.runInNewContext(inlineScript, {
		console: { error: (...args) => errors.push(args) },
		clearTimeout: clock.clearTimeout,
		document,
		fetch: (...args) => {
			fetchCalls.push(args);
			if (saveUrl && args[0] === saveUrl) {
				return Promise.resolve({ ok: true, status: 200, blob: () => Promise.resolve(new Blob(['pdf'])) });
			}
			return fetchImpl(...args);
		},
		goal: 'HavalCity_telegram_redirect',
		localStorage: storage(),
		messageToTelegram: 'Метрика не подключена',
		redirectUrl: 'https://t.me/HavalCityTonAutoBot',
		saveSearchParam: true,
		saveUrl,
		scripts_json: { metrika: { value: [{ id: 104681483 }] } },
		sessionStorage: storage(),
		setTimeout: clock.setTimeout,
		URL,
		window,
		ym,
	});

	await clock.advanceTo(advanceTo);
	return { errors, fetchCalls, href, redirectCount };
}

test('RedirectPage uses the bounded Yandex Telegram relay fallback', () => {
	assert.equal(source.includes('https://alexsab.ru/lead/tg/'), false);
	assert.equal(source.includes("fetch('https://l.alexsab.ru/lead/tg/'"), true);
	assert.match(source, /relayTimeoutMs = 2000/);
	assert.match(source, /Promise\.race\(\[relayRequest, relayTimeout\]\)/);
	assert.match(source, /\.finally\(\(\) => \{\s*clearTimeout\(relayTimeoutId\);\s*saveOrRedirect\(\);/s);
});

test('RedirectPage completes the redirect or download flow at most once', () => {
	assert.match(source, /flowCompleted = false/);
	assert.match(source, /function saveOrRedirect\(\) \{\s*if \(flowCompleted\) return;\s*flowCompleted = true;/s);
	assert.match(source, /if\(!flowCompleted\) \{/);
});

test('RedirectPage preserves the strict four-field relay payload', () => {
	const payload = source.match(/body: JSON\.stringify\(\{([\s\S]*?)\}\)\s*\}\)\.then/);
	assert.ok(payload, 'relay payload block was not found');

	const keys = Array.from(payload[1].matchAll(/^\s*([A-Za-z_][A-Za-z0-9_]*):/gm), (match) => match[1]);
	assert.deepEqual(keys, ['message', 'goal', 'redirectUrl', 'saveUrl']);
	assert.doesNotMatch(payload[1], /token|transport|recipient|notification/i);
});

test('successful Metrika completion redirects once without a relay fallback', async () => {
	const result = await runRedirectScenario({
		metricCallback: true,
		fetchImpl: () => Promise.reject(new Error('fetch must not run')),
	});

	assert.equal(result.href, 'https://t.me/HavalCityTonAutoBot');
	assert.equal(result.redirectCount, 1);
	assert.equal(result.fetchCalls.length, 0);
});

const relayCases = [
	['success', () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ answer: 'ok' }) }), 3000],
	['HTTP failure', () => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) }), 3000],
	['invalid JSON', () => Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(new Error('invalid JSON')) }), 3000],
	['network failure', () => Promise.reject(new Error('network failure')), 3000],
	['timeout', () => new Promise(() => {}), 5000],
];

for (const [name, fetchImpl, advanceTo] of relayCases) {
	test(`relay ${name} completes the redirect exactly once`, async () => {
		const result = await runRedirectScenario({ fetchImpl, advanceTo });

		assert.equal(result.href, 'https://t.me/HavalCityTonAutoBot');
		assert.equal(result.redirectCount, 1);
		assert.equal(result.fetchCalls.length, 1);
		assert.equal(result.fetchCalls[0][0], 'https://l.alexsab.ru/lead/tg/');
		assert.deepEqual(
			JSON.parse(result.fetchCalls[0][1].body),
			{
				message: 'Метрика не подключена',
				goal: 'HavalCity_telegram_redirect',
				redirectUrl: 'https://t.me/HavalCityTonAutoBot',
				saveUrl: '',
			},
		);
	});
}

test('relay failure still completes a file download flow exactly once', async () => {
	const saveUrl = 'https://cdn.alexsab.ru/bot/HavalCityTonAutoBot/offer.pdf';
	const result = await runRedirectScenario({
		advanceTo: 4000,
		fetchImpl: () => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) }),
		saveUrl,
	});

	assert.equal(result.href, saveUrl);
	assert.equal(result.redirectCount, 1);
	assert.equal(result.fetchCalls.filter(([url]) => url === 'https://l.alexsab.ru/lead/tg/').length, 1);
	assert.equal(result.fetchCalls.filter(([url]) => url === saveUrl).length, 1);
});
