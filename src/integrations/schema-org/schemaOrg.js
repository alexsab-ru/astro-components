const SCHEMA_CONTEXT = 'https://schema.org';

function isPlainObject(value) {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value)
	);
}

function normalizeNodeCollection(value, location) {
	const nodes = Array.isArray(value) ? value : [value];

	if (nodes.some((node) => !isPlainObject(node))) {
		throw new TypeError(
			`Invalid Schema.org v2 document: ${location} must contain JSON-LD objects`,
		);
	}

	return nodes;
}

export function normalizeSchemaDocument(value) {
	if (value === undefined || value === null) {
		return { global: [], routes: {} };
	}

	if (!isPlainObject(value)) {
		throw new TypeError(
			'Invalid Schema.org v2 document: root must contain exactly "global" and "routes"',
		);
	}

	const keys = Object.keys(value);
	if (
		keys.length !== 2 ||
		!keys.includes('global') ||
		!keys.includes('routes')
	) {
		throw new TypeError(
			'Invalid Schema.org v2 document: root must contain exactly "global" and "routes"; legacy route maps are not supported',
		);
	}

	if (!Array.isArray(value.global)) {
		throw new TypeError(
			'Invalid Schema.org v2 document: "global" must be an array',
		);
	}

	if (!isPlainObject(value.routes)) {
		throw new TypeError(
			'Invalid Schema.org v2 document: "routes" must be an object',
		);
	}

	const global = normalizeNodeCollection(value.global, '"global"');
	const routes = {};

	for (const [route, schemas] of Object.entries(value.routes)) {
		routes[route] = normalizeNodeCollection(
			schemas,
			`"routes"[${JSON.stringify(route)}]`,
		);
	}

	return { global, routes };
}

export function containsSchemaType(value, schemaTypes) {
	const expectedTypes = new Set(
		(Array.isArray(schemaTypes) ? schemaTypes : [schemaTypes]).map(
			normalizeSchemaType,
		),
	);
	const visited = new Set();

	function visit(candidate) {
		if (
			candidate === null ||
			typeof candidate !== 'object' ||
			visited.has(candidate)
		) {
			return false;
		}

		visited.add(candidate);

		if (Array.isArray(candidate)) {
			return candidate.some(visit);
		}

		const types = Array.isArray(candidate['@type'])
			? candidate['@type']
			: [candidate['@type']];
		if (
			types.some((type) => expectedTypes.has(normalizeSchemaType(type)))
		) {
			return true;
		}

		return Object.values(candidate).some(visit);
	}

	return visit(value);
}

function normalizeSchemaType(value) {
	if (typeof value !== 'string') {
		return value;
	}

	const absoluteType = value.match(
		/^https?:\/\/schema\.org\/([^/?#]+)\/?$/i,
	);

	return absoluteType?.[1] ?? value;
}

function getBaseUrl(siteUrl) {
	try {
		return new URL('/', siteUrl);
	} catch {
		throw new TypeError(
			'Cannot generate Schema.org URLs without a valid site URL',
		);
	}
}

function resolveHttpUrl(value, baseUrl) {
	if (typeof value !== 'string') {
		return null;
	}

	const url = value.trim();
	if (url === '' || /^\/?#/.test(url)) {
		return null;
	}

	try {
		const resolved = new URL(url, baseUrl);
		return resolved.protocol === 'http:' || resolved.protocol === 'https:'
			? resolved.href
			: null;
	} catch {
		return null;
	}
}

export function createBreadcrumbSchema({
	breadcrumbs = [],
	currentPath = '/',
	siteUrl,
}) {
	if (!Array.isArray(breadcrumbs) || breadcrumbs.length === 0) {
		return null;
	}

	const baseUrl = getBaseUrl(siteUrl);
	const items = [
		{
			'@type': 'ListItem',
			position: 1,
			name: 'Главная',
			item: new URL('/', baseUrl).href,
		},
	];

	for (const [index, breadcrumb] of breadcrumbs.entries()) {
		if (
			!isPlainObject(breadcrumb) ||
			typeof breadcrumb.name !== 'string' ||
			breadcrumb.name.trim() === ''
		) {
			continue;
		}

		const isFinal = index === breadcrumbs.length - 1;
		const href =
			typeof breadcrumb.href === 'string' &&
			breadcrumb.href.trim() !== ''
				? breadcrumb.href
				: isFinal
					? currentPath
					: null;
		const item = resolveHttpUrl(href, baseUrl);
		if (!item) {
			continue;
		}

		items.push({
			'@type': 'ListItem',
			position: items.length + 1,
			name: breadcrumb.name,
			item,
		});
	}

	return items.length > 1
		? {
				'@context': SCHEMA_CONTEXT,
				'@type': 'BreadcrumbList',
				itemListElement: items,
			}
		: null;
}

function flattenMenuLinks(menu) {
	const links = [];

	function visit(collection) {
		if (!Array.isArray(collection)) {
			return;
		}

		for (const link of collection) {
			if (!isPlainObject(link)) {
				continue;
			}

			links.push(link);

			if (Array.isArray(link.children)) {
				visit(link.children);
			} else if (isPlainObject(link.children)) {
				for (const childCollection of Object.values(link.children)) {
					visit(childCollection);
				}
			}
		}
	}

	visit(menu);
	return links;
}

export function createNavigationSchema({ menu = [], siteUrl }) {
	const baseUrl = getBaseUrl(siteUrl);
	const itemListElement = [];

	for (const link of flattenMenuLinks(menu)) {
		if (
			typeof link.name !== 'string' ||
			link.name.trim() === ''
		) {
			continue;
		}

		const url = resolveHttpUrl(link.url, baseUrl);
		if (!url) {
			continue;
		}

		itemListElement.push({
			'@type': 'SiteNavigationElement',
			position: itemListElement.length + 1,
			name: link.name,
			url,
		});
	}

	return itemListElement.length > 0
		? {
				'@context': SCHEMA_CONTEXT,
				'@type': 'ItemList',
				name: 'Главное меню',
				itemListElement,
			}
		: null;
}

export function composeSchemaOrg({
	schemaDocument,
	currentPath = '/',
	siteUrl,
	breadcrumbs = [],
	menu = [],
	flags = {},
}) {
	const schema = normalizeSchemaDocument(schemaDocument);
	const customSchemas =
		flags.useSchemaOrg === true
			? [
					...schema.global,
					...(schema.routes[currentPath] ?? []),
				]
			: [];
	const schemas = [...customSchemas];

	if (
		flags.useBreadcrumbs === true &&
		!containsSchemaType(customSchemas, 'BreadcrumbList')
	) {
		const breadcrumbSchema = createBreadcrumbSchema({
			breadcrumbs,
			currentPath,
			siteUrl,
		});
		if (breadcrumbSchema) {
			schemas.push(breadcrumbSchema);
		}
	}

	if (
		flags.useNavigation === true &&
		!containsSchemaType(customSchemas, 'SiteNavigationElement')
	) {
		const navigationSchema = createNavigationSchema({ menu, siteUrl });
		if (navigationSchema) {
			schemas.push(navigationSchema);
		}
	}

	return schemas;
}

export function serializeJsonLd(value) {
	return JSON.stringify(value).replace(/</g, '\\u003c');
}
