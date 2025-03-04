import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { COLLECTIONS } from '@/const';

// Создаем коллекции
const objectCollections = COLLECTIONS.reduce((acc, collection) => {
	acc[collection.name] = defineCollection({
		loader: glob({ pattern: "**/*.mdx", base: "./src/content/" + collection.name }),
		schema: z.object({
			h1: z.string().optional(),
			title: z.string().optional(),
			caption: z.string().optional(),
			breadcrumb: z.string().optional(),
			description: z.string().optional(),
			image: z.string().optional(),
			pubDate: z.coerce.date().optional(),
			toDate: z.union([z.boolean().optional(), z.coerce.date().optional()]),
			// content: z.string().optional(),
		}),
	}); // Используем collection.name как ключ
	return acc; // Возвращаем измененный аккумулятор
}, {});

const seoCollection = defineCollection({});

export const collections = {
	...objectCollections,
	seo: seoCollection,
};
