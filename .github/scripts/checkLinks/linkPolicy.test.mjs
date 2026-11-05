import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadLinkPolicy, matchesSkipRule, validatePolicy } from './linkPolicy.mjs';

const policy = {
	version: 1,
	excludeSites: ['dev.alexsab.ru'],
	skip: [
		{ host: 'tbank.ru', pathname: '/', reason: 'CI certificate chain' },
		{ host: 'tbank.ru', pathname: '/loans/auto-loan/programs/', reason: 'CI certificate chain' },
		{ host: 'hotel-prestige.ru', pathname: '/', reason: 'CI timeout' },
		{ host: 'www.vsk.ru', pathPrefix: '/klientam', reason: 'Legacy exception' },
	],
};

test('bank rules cover www and query strings without matching other hosts', () => {
	assert.equal(matchesSkipRule('https://www.tbank.ru/?utm_source=client', policy), true);
	assert.equal(matchesSkipRule('https://tbank.ru/loans/auto-loan/programs/', policy), true);
	for (const url of ['https://tbank.ru.example.com/', 'https://other-tbank.ru/', 'https://tbank.ru@evil.ru/', 'https://sub.tbank.ru/', 'https://www.tbank.ru/missing/']) {
		assert.equal(matchesSkipRule(url, policy), false, url);
	}
});

test('page rules ignore UTM but do not suppress other hotel pages or site 404s', () => {
	assert.equal(matchesSkipRule('https://hotel-prestige.ru/?utm_campaign=kaiyi-krd', policy), true);
	for (const url of ['https://hotel-prestige.ru/missing/', 'https://china-samara-auto.ru/models/t9/', 'https://alexsab.ru/', 'https://cdn.avtotor-static.oneplatform.site/baic/', 'not a URL']) {
		assert.equal(matchesSkipRule(url, policy), false, url);
	}
	assert.equal(matchesSkipRule('https://www.vsk.ru/klientam/insurance', policy), true);
	assert.equal(matchesSkipRule('https://www.vsk.ru/missing', policy), false);
});

test('rejects malformed policy rather than silently losing exclusions', () => {
	for (const invalid of [{}, { ...policy, version: 2 }, { ...policy, excludeSites: ['https://example.com'] }, { ...policy, skip: [{ host: 'tbank.ru' }] }, { ...policy, skip: [{ host: 'tbank.ru', reason: 'test', pathname: '' }] }]) {
		assert.throws(() => validatePolicy(invalid));
	}
});

test('reads synced JSON locally and rejects malformed or missing data', async () => {
	const dir = await mkdtemp(path.join(os.tmpdir(), 'link-policy-'));
	try {
		const file = path.join(dir, 'policy.json');
		await writeFile(file, JSON.stringify(policy));
		const result = await loadLinkPolicy(file);
		assert.deepEqual(result.policy, policy);
		await writeFile(file, '{}');
		await assert.rejects(loadLinkPolicy(file), /схема/);
		await assert.rejects(loadLinkPolicy(path.join(dir, 'missing.json')), /ENOENT/);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});
