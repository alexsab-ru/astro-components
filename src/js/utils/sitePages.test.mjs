import assert from 'node:assert/strict';
import test from 'node:test';
import {
	findPageByUrl,
	getAlwaysAvailableCollections,
	getDisabledUrls,
	getPageTitle,
	getSitemapIgnoredUrls,
	isUrlDisabled,
	listPages,
	normalizePageUrl,
} from './sitePages.js';

const PAGES = {
	'/privacy-policy/': {title: 'Политика конфиденциальности', enabled: true, sitemap: true},
	'/advertising-consent/': {title: 'Согласие на рекламные сообщения', enabled: false, sitemap: true},
	'/trade-in/': {title: 'Trade-in', enabled: false, sitemap: true},
	'/model-page/': {title: 'Модель', enabled: true, sitemap: false},
	'/models/': {title: 'Модели', enabled: true, sitemap: true},
	'/news/': {title: 'Новости', enabled: true, sitemap: true, collection: 'news', always_available: true},
	broken: 'не объект',
};

test('normalizePageUrl приводит к виду /path/', () => {
	assert.equal(normalizePageUrl('/models'), '/models/');
	assert.equal(normalizePageUrl('models/'), '/models/');
	assert.equal(normalizePageUrl('/models/?a=1'), '/models/');
	assert.equal(normalizePageUrl('/models/#top'), '/models/');
	assert.equal(normalizePageUrl(''), '');
	assert.equal(normalizePageUrl(undefined), '');
});

test('listPages отбрасывает записи, значение которых не объект, и берёт url из ключа', () => {
	const urls = listPages(PAGES).map((page) => page.url);
	assert.ok(!urls.includes('broken'), 'запись-не-объект не попадает в список');
	assert.ok(urls.includes('/models/'));
	assert.equal(listPages(PAGES).find((page) => page.url === '/models/').title, 'Модели');
});

test('listPages нормализует ключ, даже если он записан не канонически', () => {
	const pages = {'/models': {title: 'Модели'}};
	assert.equal(listPages(pages)[0].url, '/models/');
});

test('getDisabledUrls отдаёт только enabled === false', () => {
	assert.deepEqual(getDisabledUrls(PAGES).sort(), ['/advertising-consent/', '/trade-in/']);
});

test('запись без enabled считается включённой', () => {
	assert.deepEqual(getDisabledUrls({'/about/': {}}), []);
});

test('getSitemapIgnoredUrls не дублирует выключенные страницы', () => {
	assert.deepEqual(getSitemapIgnoredUrls(PAGES), ['/model-page/']);
});

test('getAlwaysAvailableCollections отдаёт имена коллекций', () => {
	assert.deepEqual(getAlwaysAvailableCollections(PAGES), ['news']);
});

test('getAlwaysAvailableCollections отбрасывает недопустимые имена', () => {
	const pages = {'/bad/': {collection: 'Bad Name', always_available: true}};
	assert.deepEqual(getAlwaysAvailableCollections(pages), []);
});

test('findPageByUrl находит запись независимо от слэша', () => {
	assert.equal(findPageByUrl(PAGES, '/models').url, '/models/');
	assert.equal(findPageByUrl(PAGES, '/models/').url, '/models/');
	assert.equal(findPageByUrl(PAGES, '/unknown/'), undefined);
});

test('getPageTitle отдаёт подпись из реестра', () => {
	assert.equal(getPageTitle(PAGES, '/models/'), 'Модели');
	assert.equal(getPageTitle(PAGES, '/unknown/'), undefined);
});

test('isUrlDisabled ловит поддерево выключенной страницы', () => {
	assert.equal(isUrlDisabled(PAGES, '/trade-in/'), true);
	assert.equal(isUrlDisabled(PAGES, '/trade-in/form/'), true);
	assert.equal(isUrlDisabled(PAGES, '/models/'), false);
});

test('пустой реестр никого не выключает', () => {
	assert.equal(isUrlDisabled({}, '/trade-in/'), false);
	assert.deepEqual(getDisabledUrls(undefined), []);
});
