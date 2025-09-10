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
		// Добавляем поля ссылок, чтобы они попадали в post.data
		// Astro с включенной схемой отбрасывает неописанные поля
		url: z.string().optional(),
		link: z.string().optional(),
		href: z.string().optional(),
		// Разрешаем задавать slug во frontmatter как альтернативную ссылку
		slug: z.string().optional(),
		// content: z.string().optional(),
	}),
};
