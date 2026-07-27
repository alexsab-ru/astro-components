import assert from 'node:assert/strict';
import test from 'node:test';
import {
	composeSchemaOrg,
	containsSchemaType,
	createBreadcrumbSchema,
	createNavigationSchema,
	normalizeSchemaDocument,
	serializeJsonLd,
} from './schemaOrg.js';

const SITE_URL = 'https://dealer.example/';

test('accepts only the strict v2 global/routes root contract', () => {
	const document = {
		global: [{ '@type': 'Organization' }],
		routes: {
			'/contacts/': { '@type': 'ContactPage' },
		},
	};

	assert.deepEqual(normalizeSchemaDocument(document), {
		global: [{ '@type': 'Organization' }],
		routes: {
			'/contacts/': [{ '@type': 'ContactPage' }],
		},
	});
	assert.throws(
		() =>
			normalizeSchemaDocument({
				'/': [{ '@type': 'Organization' }],
			}),
		/legacy route maps are not supported/,
	);
	assert.throws(
		() => normalizeSchemaDocument({ global: [], routes: {}, extra: true }),
		/root must contain exactly/,
	);
});

test('allows a missing schema file and keeps all flags false by default', () => {
	assert.deepEqual(
		composeSchemaOrg({
			schemaDocument: undefined,
			currentPath: '/',
			siteUrl: SITE_URL,
			breadcrumbs: [{ name: 'Контакты', href: '' }],
			menu: [{ name: 'Контакты', url: '/contacts/' }],
		}),
		[],
	);
});

test('combines global and current route schemas only when custom data is enabled', () => {
	const schemaDocument = {
		global: [{ '@type': 'Organization' }],
		routes: {
			'/': [{ '@type': 'WebSite' }],
			'/contacts/': { '@type': 'ContactPage' },
		},
	};

	assert.deepEqual(
		composeSchemaOrg({
			schemaDocument,
			currentPath: '/contacts/',
			siteUrl: SITE_URL,
			flags: { useSchemaOrg: true },
		}).map((schema) => schema['@type']),
		['Organization', 'ContactPage'],
	);
	assert.deepEqual(
		composeSchemaOrg({
			schemaDocument,
			currentPath: '/missing/',
			siteUrl: SITE_URL,
			flags: { useSchemaOrg: true },
		}).map((schema) => schema['@type']),
		['Organization'],
	);
});

test('generates breadcrumbs independently and resolves an empty final href', () => {
	const breadcrumbs = [
		{ name: 'Модели', href: '/models/' },
		{ name: 'Модель', href: '' },
	];
	const snapshot = structuredClone(breadcrumbs);
	const schema = createBreadcrumbSchema({
		breadcrumbs,
		currentPath: '/models/model/',
		siteUrl: SITE_URL,
	});

	assert.deepEqual(breadcrumbs, snapshot);
	assert.equal(schema['@type'], 'BreadcrumbList');
	assert.deepEqual(
		schema.itemListElement.map((item) => item.item),
		[
			'https://dealer.example/',
			'https://dealer.example/models/',
			'https://dealer.example/models/model/',
		],
	);
	assert.equal(
		composeSchemaOrg({
			currentPath: '/models/model/',
			siteUrl: SITE_URL,
			breadcrumbs,
			flags: { useBreadcrumbs: true },
		})[0]['@type'],
		'BreadcrumbList',
	);
});

test('generates navigation independently and filters unsafe or hash-only links', () => {
	const schema = createNavigationSchema({
		siteUrl: SITE_URL,
		menu: [
			{ name: 'Модели', url: '/models/' },
			{ name: 'Якорь', url: '#contacts' },
			{ name: 'Корневой якорь', url: '/#contacts' },
			{ name: 'JavaScript', url: 'javascript:alert(1)' },
			{ name: 'Почта', url: 'mailto:test@example.com' },
			{ name: 'Телефон', url: 'tel:+70000000000' },
			{
				name: 'Внешняя',
				url: 'https://external.example/path/',
				children: {
					brand: [
						{ name: 'Дочерняя', url: '/models/child/' },
					],
				},
			},
		],
	});

	assert.deepEqual(
		schema.itemListElement.map(({ name, url }) => ({ name, url })),
		[
			{ name: 'Модели', url: 'https://dealer.example/models/' },
			{
				name: 'Внешняя',
				url: 'https://external.example/path/',
			},
			{
				name: 'Дочерняя',
				url: 'https://dealer.example/models/child/',
			},
		],
	);
	assert.equal(
		composeSchemaOrg({
			siteUrl: SITE_URL,
			menu: [{ name: 'Модели', url: '/models/' }],
			flags: { useNavigation: true },
		})[0]['@type'],
		'ItemList',
	);
});

test('an unrelated custom ItemList does not suppress generated navigation', () => {
	const schemaDocument = {
		global: [
			{
				'@context': 'https://schema.org',
				'@type': 'ItemList',
				name: 'Автомобили',
			},
		],
		routes: {},
	};
	const schemas = composeSchemaOrg({
		schemaDocument,
		currentPath: '/',
		siteUrl: SITE_URL,
		menu: [{ name: 'Модели', url: '/models/' }],
		flags: {
			useSchemaOrg: true,
			useNavigation: true,
		},
	});

	assert.equal(schemas.length, 2);
	assert.equal(schemas[0].name, 'Автомобили');
	assert.equal(schemas[1].name, 'Главное меню');
});

test('compact and absolute SiteNavigationElement types suppress generated navigation', () => {
	for (const type of [
		'SiteNavigationElement',
		'https://schema.org/SiteNavigationElement',
		'http://schema.org/SiteNavigationElement',
	]) {
		const schemaDocument = {
			global: [
				{
					'@context': 'https://schema.org',
					'@graph': [
						{
							'@type': 'Thing',
							nested: { '@type': type },
						},
					],
				},
			],
			routes: {},
		};
		const schemas = composeSchemaOrg({
			schemaDocument,
			currentPath: '/',
			siteUrl: SITE_URL,
			menu: [{ name: 'Модели', url: '/models/' }],
			flags: {
				useSchemaOrg: true,
				useNavigation: true,
			},
		});

		assert.equal(schemas.length, 1);
		assert.equal(
			containsSchemaType(schemas, 'SiteNavigationElement'),
			true,
		);
	}
});

test('an absolute BreadcrumbList type suppresses generated breadcrumbs', () => {
	const schemaDocument = {
		global: [
			{
				'@context': 'https://schema.org',
				'@graph': [
					{ '@type': 'https://schema.org/BreadcrumbList' },
				],
			},
		],
		routes: {},
	};
	const schemas = composeSchemaOrg({
		schemaDocument,
		currentPath: '/contacts/',
		siteUrl: SITE_URL,
		breadcrumbs: [{ name: 'Контакты', href: '' }],
		flags: {
			useSchemaOrg: true,
			useBreadcrumbs: true,
		},
	});

	assert.equal(schemas.length, 1);
	assert.equal(containsSchemaType(schemas, 'BreadcrumbList'), true);
});

test('serializes JSON-LD without a literal script-closing sequence', () => {
	const serialized = serializeJsonLd([
		{ '@type': 'Thing', name: '</script><script>alert(1)</script>' },
	]);

	assert.equal(serialized.includes('<'), false);
	assert.deepEqual(JSON.parse(serialized), [
		{ '@type': 'Thing', name: '</script><script>alert(1)</script>' },
	]);
});
