import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import {
	canonicalizeRegistryKey,
	checkCanonicalKeys,
	collectRouteSlugs,
	comparePagesToRoutes,
	templatePagesJsonPath,
} from './checkPagesRegistry.mjs';

test('collectRouteSlugs превращает пути файлов в слаги', () => {
	assert.deepEqual(
		collectRouteSlugs([
			'src/pages/contacts.astro',
			'src/pages/models/index.astro',
			'src/pages/used_cars/index.astro',
		]),
		['contacts', 'models', 'used_cars'],
	);
});

test('collectRouteSlugs выбрасывает служебные, главную и динамические', () => {
	assert.deepEqual(
		collectRouteSlugs([
			'src/pages/404.astro',
			'src/pages/index.astro',
			'src/pages/cars/[...slug].astro',
			'src/pages/[collection]/index.astro',
			'src/pages/contacts.astro',
		]),
		['contacts'],
	);
});

test('всё совпадает — обе стороны пусты', () => {
	const result = comparePagesToRoutes(
		{'/contacts/': {}, '/models/': {}},
		['contacts', 'models'],
	);
	assert.deepEqual(result, {missingInRegistry: [], missingInPages: []});
});

test('маршрут шаблона без записи в реестре', () => {
	const result = comparePagesToRoutes({'/contacts/': {}}, ['contacts', 'test-drive']);
	assert.deepEqual(result.missingInRegistry, ['test-drive']);
	assert.deepEqual(result.missingInPages, []);
});

test('запись реестра без маршрута', () => {
	const result = comparePagesToRoutes(
		{'/contacts/': {}, '/ghost/': {}},
		['contacts'],
	);
	assert.deepEqual(result.missingInPages, ['/ghost/']);
	assert.deepEqual(result.missingInRegistry, []);
});

test('терпимо относится к ключам без ведущего/завершающего слэша', () => {
	const result = comparePagesToRoutes(
		{
			contacts: {},
			'/models': {},
		},
		['contacts', 'models'],
	);
	assert.deepEqual(result, {missingInRegistry: [], missingInPages: []});
});

test('записи коллекций из сверки исключены', () => {
	const result = comparePagesToRoutes(
		{'/news/': {collection: 'news'}, '/contacts/': {}},
		['contacts'],
	);
	assert.deepEqual(result, {missingInRegistry: [], missingInPages: []});
});

test('canonicalizeRegistryKey добавляет слэши, убирает query/якорь и схлопывает двойные слэши', () => {
	assert.equal(canonicalizeRegistryKey('/trade-in/'), '/trade-in/');
	assert.equal(canonicalizeRegistryKey('trade-in'), '/trade-in/');
	assert.equal(canonicalizeRegistryKey('/trade-in'), '/trade-in/');
	assert.equal(canonicalizeRegistryKey('trade-in/'), '/trade-in/');
	assert.equal(canonicalizeRegistryKey('//trade-in//'), '/trade-in/');
	assert.equal(canonicalizeRegistryKey('/trade-in/?a=1'), '/trade-in/');
	assert.equal(canonicalizeRegistryKey('/trade-in/#top'), '/trade-in/');
	assert.equal(canonicalizeRegistryKey(''), '/');
});

test('checkCanonicalKeys ловит ключ не в каноническом виде', () => {
	const problems = checkCanonicalKeys('/repo/pages.json', {'trade-in': {enabled: false}});
	assert.equal(problems.length, 1);
	assert.equal(problems[0].file, '/repo/pages.json');
	assert.equal(problems[0].key, 'trade-in');
	assert.match(problems[0].message, /"\/trade-in\/"/);
});

test('checkCanonicalKeys ловит двойной слэш и ?/# в ключе', () => {
	const problems = checkCanonicalKeys('/repo/pages.json', {
		'//trade-in//': {},
		'/models/?a=1': {},
		'/news/#top': {},
	});
	assert.equal(problems.length, 3);
	assert.ok(problems.every((p) => p.message.includes('не в каноническом виде')));
});

test('checkCanonicalKeys не ругается на уже канонические ключи', () => {
	const problems = checkCanonicalKeys('/repo/pages.json', {
		'/trade-in/': {enabled: false},
		'/models/': {enabled: true},
	});
	assert.deepEqual(problems, []);
});

test('checkCanonicalKeys ловит два ключа, дающих один URL после нормализации', () => {
	const problems = checkCanonicalKeys('/repo/pages.json', {
		'/trade-in/': {enabled: false},
		'/trade-in': {enabled: true},
	});
	const duplicate = problems.find((p) => p.message.includes('один и тот же URL'));
	assert.ok(duplicate, 'должна быть найдена коллизия ключей');
	assert.match(duplicate.message, /"\/trade-in\/"/);
	assert.match(duplicate.message, /"\/trade-in"/);
});

test('templatePagesJsonPath смотрит на соседний astro-json по умолчанию', () => {
	const previous = process.env.ASTRO_JSON_LOCAL_PATH;
	delete process.env.ASTRO_JSON_LOCAL_PATH;
	try {
		assert.equal(
			templatePagesJsonPath('/repo/astro-components'),
			path.resolve('/repo/astro-components', '../astro-json', 'data/json/pages.json'),
		);
	} finally {
		if (previous === undefined) delete process.env.ASTRO_JSON_LOCAL_PATH;
		else process.env.ASTRO_JSON_LOCAL_PATH = previous;
	}
});

test('templatePagesJsonPath уважает переопределение ASTRO_JSON_LOCAL_PATH', () => {
	const previous = process.env.ASTRO_JSON_LOCAL_PATH;
	process.env.ASTRO_JSON_LOCAL_PATH = '/custom/astro-json';
	try {
		assert.equal(
			templatePagesJsonPath('/repo/astro-components'),
			path.resolve('/custom/astro-json', 'data/json/pages.json'),
		);
	} finally {
		if (previous === undefined) delete process.env.ASTRO_JSON_LOCAL_PATH;
		else process.env.ASTRO_JSON_LOCAL_PATH = previous;
	}
});
