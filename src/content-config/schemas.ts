import { z } from 'astro:content';

export const pageCollectionSchema = z.object({
	h1: z.string().optional(),
	title: z.string().optional(),
	caption: z.string().optional(),
	draft: z.boolean().optional(),
	// Скрывает активную страницу из списков, сохраняя её прямой URL.
	listed: z.boolean().optional(),
	breadcrumb: z.string().optional(),
	description: z.string().optional(),
	image: z.string().optional(),
	pubDate: z.coerce.date().optional(),
	toDate: z.union([z.boolean(), z.coerce.date()]).optional(),
	brand: z.string().optional(),
	url: z.string().optional(),
	link: z.string().optional(),
	href: z.string().optional(),
});

export const vehicleSchema = z.object({
	h1: z.string(),
	title: z.string(),
	breadcrumb: z.string(),
	description: z.string(),
	mark_id: z.string(),
	folder_id: z.string(),
	color: z.string(),
	color_rus: z.string().optional(),
	color_eng: z.string().optional(),
	price: z.number(),
	priceWithDiscount: z.number(),
	sale_price: z.number(),
	max_discount: z.number(),
	credit_discount: z.number().default(0).optional(),
	insurance_discount: z.number().default(0).optional(),
	optional_discount: z.number().default(0).optional(),
	tradein_discount: z.number().default(0).optional(),
	availability: z.string().default('в наличии').optional(),
	modification_id: z.string().optional(),
	run: z.number(),
	body_type: z.string().optional(),
	complectation_name: z.string().optional(),
	wheel: z.string().optional(),
	year: z.number(),
	image: z.string(),
	images: z.array(z.string()).default([]),
	thumbs: z.array(z.string()).default([]),
	imageSets: z.array(z.object({
		full: z.string(),
		large: z.string(),
		medium: z.string(),
		small: z.string(),
		thumb: z.string(),
	})).default([]),
	order: z.number(),
	total: z.number(),
	url: z.string(),
	vin: z.string(),
	vin_hidden: z.string(),
	vin_list: z.string(),
});

export const carsSchema = vehicleSchema.extend({
	model_id: z.string().optional(),
});

export const usedCarsSchema = vehicleSchema;
