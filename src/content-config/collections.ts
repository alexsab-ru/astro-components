import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { getRegularCollectionNames, hasContentCollection } from './fs';
import { carsSchema, pageCollectionSchema, usedCarsSchema } from './schemas';

export type CollectionMeta = {
	name: string;
	title: string;
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

const readSeoData = (): Record<string, SeoEntry> => {
	const path = resolve(process.cwd(), 'src/data/site/seo.json');
	if (!existsSync(path)) return {};

	return JSON.parse(readFileSync(path, 'utf-8'));
};

const seoData = readSeoData();

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

export const getContentCollections = (): CollectionMeta[] =>
	getRegularCollectionNames().map((name) => {
		const seo = seoData[`/${name}/`];
		const title = seo?.h1 || seo?.breadcrumb || titleFromSeoTitle(seo?.title);

		return {
			name,
			title: title || titleFromCollectionName(name),
			description: seo?.description || '',
			image: seo?.image || '',
		};
	});

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
