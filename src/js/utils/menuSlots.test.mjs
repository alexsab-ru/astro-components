import assert from 'node:assert/strict';
import test from 'node:test';
import { MENU_SLOTS, getSlotItems, menuItemPath, resolveMenu } from './menuSlots.js';

const PAGES = {
	models: {url: '/models/', title: 'Модели', enabled: true, sitemap: true},
	'test-drive': {url: '/test-drive/', title: 'Запись на тест-драйв', enabled: true, sitemap: true},
	'trade-in': {url: '/trade-in/', title: 'Trade-in', enabled: false, sitemap: true},
	'privacy-policy': {url: '/privacy-policy/', title: 'Политика конфиденциальности', enabled: true, sitemap: true},
	'advertising-consent': {url: '/advertising-consent/', title: 'Согласие на рекламные сообщения', enabled: false, sitemap: true},
};

const MENU = {
	main: [
		{url: '/models/', children: 'models'},
		{url: '/test-drive/'},
		{url: '/trade-in/'},
		{url: '/#services', title: 'Услуги'},
		{url: 'https://example.com/', title: 'Внешняя'},
	],
	footer_legal: [
		{url: '/privacy-policy/'},
		{url: '/advertising-consent/'},
	],
};

test('MENU_SLOTS перечисляет четыре слота', () => {
	assert.deepEqual(MENU_SLOTS, ['header', 'main', 'footer', 'footer_legal']);
});

test('menuItemPath отдаёт пустую строку там, где проверять нечего', () => {
	assert.equal(menuItemPath('/#services'), '');
	assert.equal(menuItemPath('#services'), '');
	assert.equal(menuItemPath('https://example.com/'), '');
	assert.equal(menuItemPath('tel:+70000000000'), '');
	assert.equal(menuItemPath(''), '');
	assert.equal(menuItemPath('/models'), '/models/');
	assert.equal(menuItemPath('/models/#top'), '/models/');
});

test('слот footer при отсутствии берётся из main', () => {
	assert.equal(getSlotItems(MENU, 'footer').length, MENU.main.length);
	assert.deepEqual(getSlotItems({footer: [{url: '/contacts/'}], main: []}, 'footer'), [{url: '/contacts/'}]);
	assert.deepEqual(getSlotItems({}, 'footer'), []);
});

test('неизвестный слот даёт пустой массив', () => {
	assert.deepEqual(getSlotItems(MENU, 'header'), []);
	assert.deepEqual(getSlotItems(MENU, 'nope'), []);
});

test('пункты на выключенные страницы отбрасываются', () => {
	const urls = resolveMenu(MENU, PAGES, 'main').map((item) => item.url);
	assert.ok(!urls.includes('/trade-in/'), 'выключенная страница ушла из меню');
	assert.deepEqual(urls, ['/models/', '/test-drive/', '/#services', 'https://example.com/']);
});

test('якорь и внешняя ссылка не фильтруются никогда', () => {
	const urls = resolveMenu(MENU, {models: {url: '/models/', enabled: false}}, 'main').map((item) => item.url);
	assert.ok(urls.includes('/#services'));
	assert.ok(urls.includes('https://example.com/'));
	assert.ok(!urls.includes('/models/'));
});

test('подпись берётся из реестра, если в пункте её нет', () => {
	const items = resolveMenu(MENU, PAGES, 'main');
	assert.equal(items.find((item) => item.url === '/test-drive/').name, 'Запись на тест-драйв');
});

test('явный title в пункте важнее реестра', () => {
	const menu = {main: [{url: '/models/', title: 'Наши модели'}]};
	assert.equal(resolveMenu(menu, PAGES, 'main')[0].name, 'Наши модели');
});

test('устаревшее поле name продолжает работать', () => {
	const menu = {main: [{url: '/models/', name: 'Старое имя'}]};
	assert.equal(resolveMenu(menu, PAGES, 'main')[0].name, 'Старое имя');
});

test('подписи нет нигде — пустая строка, не undefined', () => {
	const menu = {main: [{url: '/unknown/'}]};
	assert.equal(resolveMenu(menu, PAGES, 'main')[0].name, '');
});

test('children сохраняются как есть', () => {
	assert.equal(resolveMenu(MENU, PAGES, 'main')[0].children, 'models');
});

test('footer_legal чистится реестром без отдельной настройки', () => {
	const urls = resolveMenu(MENU, PAGES, 'footer_legal').map((item) => item.url);
	assert.deepEqual(urls, ['/privacy-policy/']);
});

test('подпись якоря без title не подтягивается из реестра', () => {
	const pages = {home: {url: '/', title: 'Главная', enabled: true, sitemap: true}};
	const menu = {main: [{url: '/#services'}]};
	assert.equal(resolveMenu(menu, pages, 'main')[0].name, '');
});

test('в main javascript: — заголовок выпадающего меню и остаётся вместе с children', () => {
	const menu = {
		main: [
			{url: 'javascript:void(0)', title: 'Покупателям', children: 'buyers'},
			{url: 'JavaScript:void(0)', title: 'Регистр не важен', children: 'case'},
			{url: '  javascript:void(0)  ', title: 'Пробелы вокруг', children: 'trim'},
			{url: 'https://example.com/', title: 'Внешняя'},
			{url: 'tel:+70000000000', title: 'Телефон'},
			{url: 'mailto:info@example.com', title: 'Почта'},
			{url: '/#services', title: 'Якорь'},
		],
	};
	const items = resolveMenu(menu, PAGES, 'main');
	const urls = items.map((item) => item.url);
	assert.deepEqual(urls, [
		'javascript:void(0)',
		'JavaScript:void(0)',
		'  javascript:void(0)  ',
		'https://example.com/',
		'tel:+70000000000',
		'mailto:info@example.com',
		'/#services',
	]);
	assert.equal(items.find((item) => item.title === 'Покупателям').children, 'buyers');
});

test('в footer javascript: пункты отбрасываются, остальные схемы остаются', () => {
	const menu = {
		footer: [
			{url: 'javascript:void(0)', title: 'Покупателям', children: 'buyers'},
			{url: 'https://example.com/', title: 'Внешняя'},
			{url: 'tel:+70000000000', title: 'Телефон'},
			{url: 'mailto:info@example.com', title: 'Почта'},
			{url: '/#services', title: 'Якорь'},
		],
	};
	const urls = resolveMenu(menu, PAGES, 'footer').map((item) => item.url);
	assert.deepEqual(urls, [
		'https://example.com/',
		'tel:+70000000000',
		'mailto:info@example.com',
		'/#services',
	]);
});
