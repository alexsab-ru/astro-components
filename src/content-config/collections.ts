import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { getRegularCollectionNames, hasContentCollection } from './fs';
import { carsSchema, pageCollectionSchema, usedCarsSchema } from './schemas';

export type CollectionMeta = {
	name: string;
	/** Полный SEO title для тега <title> */
	title: string;
	/** Видимый заголовок страницы коллекции */
	h1: string;
	/** Короткая подпись коллекции для хлебных крошек */
	breadcrumb: string;
	description: string;
	image: string;
};

type SeoEntry = {
	title?: string;
	h1?: string;
	breadcrumb?: string;
	description?: string;
	image?: string;
};

type RoutesData = {
	always_available_collections?: unknown;
};

const readSeoData = (): Record<string, SeoEntry> => {
	const path = resolve(process.cwd(), 'src/data/site/seo.json');
	if (!existsSync(path)) return {};

	return JSON.parse(readFileSync(path, 'utf-8'));
};

const seoData = readSeoData();

const readAlwaysAvailableCollections = (): string[] => {
	const path = resolve(process.cwd(), 'src/data/site/routes.json');
	if (!existsSync(path)) return [];

	const routes = JSON.parse(readFileSync(path, 'utf-8')) as RoutesData;
	if (!Array.isArray(routes.always_available_collections)) return [];

	return routes.always_available_collections
		.filter((name): name is string => typeof name === 'string')
		.map((name) => name.trim())
		.filter((name) => /^[a-z0-9][a-z0-9_-]*$/.test(name));
};

const alwaysAvailableCollections = readAlwaysAvailableCollections();

const titleFromSeoTitle = (title?: string): string | undefined => {
	const value = title?.split('|')[0]?.trim();
	return value || undefined;
};

export const titleFromCollectionName = (name: string): string =>
	name
		.split('-')
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');

/** SEO title: берём seo.title целиком, без обрезки по «|» */
const resolveCollectionTitle = (seo: SeoEntry | undefined, name: string): string =>
	seo?.title ||
	seo?.h1 ||
	seo?.breadcrumb ||
	titleFromCollectionName(name);

/** h1 на странице: отдельное поле, короткая часть title — только как fallback */
const resolveCollectionH1 = (seo: SeoEntry | undefined, name: string): string =>
	seo?.h1 ||
	titleFromSeoTitle(seo?.title) ||
	seo?.breadcrumb ||
	titleFromCollectionName(name);

/** Подпись для крошек: breadcrumb → h1 → короткая часть title → slug */
const resolveCollectionBreadcrumb = (seo: SeoEntry | undefined, name: string): string =>
	seo?.breadcrumb ||
	seo?.h1 ||
	titleFromSeoTitle(seo?.title) ||
	titleFromCollectionName(name);

const getCollectionMeta = (name: string): CollectionMeta => {
	const seo = seoData[`/${name}/`];

	return {
		name,
		title: resolveCollectionTitle(seo, name),
		h1: resolveCollectionH1(seo, name),
		breadcrumb: resolveCollectionBreadcrumb(seo, name),
		description: seo?.description || '',
		image: seo?.image || '',
	};
};

export const getContentCollections = (): CollectionMeta[] =>
	getRegularCollectionNames().map(getCollectionMeta);

export const getIndexCollections = (): CollectionMeta[] =>
	[...new Set([...getRegularCollectionNames(), ...alwaysAvailableCollections])]
		.sort()
		.map(getCollectionMeta);

const createGlobCollection = (collection: string, schema?: unknown) => defineCollection({
	loader: glob({
		base: `./src/content/${collection}`,
		pattern: '**/*.{md,mdx}',
		exclude: ['**/__*'],
	} as any),
	...(schema ? { schema } : {}),
});

export const pageCollections = Object.fromEntries(
	getContentCollections().map((collection) => [
		collection.name,
		createGlobCollection(collection.name, pageCollectionSchema),
	]),
);

export const seoCollections = hasContentCollection('seo')
	? { seo: createGlobCollection('seo') }
	: {};

export const vehicleCollections = {
	...(hasContentCollection('cars') ? { cars: createGlobCollection('cars', carsSchema) } : {}),
	...(hasContentCollection('used_cars') ? { used_cars: createGlobCollection('used_cars', usedCarsSchema) } : {}),
};
