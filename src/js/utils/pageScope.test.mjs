import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePageDealer, scopeSalons } from './pageScope.js';

const city = { name: 'HAVAL CITY Тон-Авто', scripts: { calltouch: { routeKey: 'city-route' } } };
const pro = { name: 'HAVAL PRO Тон-Авто', scripts: { calltouch: { routeKey: 'pro-route' } } };
const salons = [city, pro];

test('ordinary pages keep both dealers and have no pinned dealer', () => {
	assert.equal(resolvePageDealer(salons), undefined);
	assert.equal(scopeSalons(salons), salons);
});

test('campaign pages keep only the chosen dealer and its routing metadata', () => {
	for (const dealer of salons) {
		const selected = resolvePageDealer(salons, dealer.name);
		assert.equal(selected, dealer);
		assert.deepEqual(scopeSalons(salons, selected), [dealer]);
	}
});

test('unknown and ambiguous dealer names fail instead of routing to another salon', () => {
	assert.throws(() => resolvePageDealer(salons, 'Missing dealer'), /found 0/);
	assert.throws(() => resolvePageDealer([city, city], city.name), /found 2/);
	assert.deepEqual(scopeSalons([pro], city), []);
});
