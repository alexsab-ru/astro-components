import { z } from 'astro:content';

export const collectionSchema = {
	type: 'content', // Это важно!
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
};
