import assert from 'node:assert/strict';
import test from 'node:test';
import { collectRouteSlugs, comparePagesToRoutes } from './checkPagesRegistry.mjs';

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
		{contacts: {url: '/contacts/'}, models: {url: '/models/'}},
		['contacts', 'models'],
	);
	assert.deepEqual(result, {missingInRegistry: [], missingInPages: []});
});

test('маршрут шаблона без записи в реестре', () => {
	const result = comparePagesToRoutes({contacts: {url: '/contacts/'}}, ['contacts', 'test-drive']);
	assert.deepEqual(result.missingInRegistry, ['test-drive']);
	assert.deepEqual(result.missingInPages, []);
});

test('запись реестра без маршрута', () => {
	const result = comparePagesToRoutes(
		{contacts: {url: '/contacts/'}, ghost: {url: '/ghost/'}},
		['contacts'],
	);
	assert.deepEqual(result.missingInPages, ['/ghost/']);
	assert.deepEqual(result.missingInRegistry, []);
});

test('нормализует url реестра независимо от слэшей', () => {
	const result = comparePagesToRoutes(
		{
			a: {url: 'contacts'},
			b: {url: '/models'},
			c: {url: '//used_cars//'},
		},
		['contacts', 'models', 'used_cars'],
	);
	assert.deepEqual(result, {missingInRegistry: [], missingInPages: []});
});

test('записи коллекций из сверки исключены', () => {
	const result = comparePagesToRoutes(
		{news: {url: '/news/', collection: 'news'}, contacts: {url: '/contacts/'}},
		['contacts'],
	);
	assert.deepEqual(result, {missingInRegistry: [], missingInPages: []});
});
