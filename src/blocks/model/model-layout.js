export const MODEL_PART_ORDER = [
	'hero',
	'media',
	'colors',
	'photos',
	'characteristics',
	'actions',
];
export const MODEL_HERO_ORDER = [
	'breadcrumb',
	'heading',
	'slogan',
	'price',
	'benefits',
];

/** Move specified parts first; keep unspecified parts in their original order. */
export function resolveModelOrder(order, defaults = MODEL_PART_ORDER) {
	const requested = Array.isArray(order)
		? order.filter((key) => defaults.includes(key))
		: [];
	return [...new Set([...requested, ...defaults])];
}

export const isModelPartVisible = (parts, key) => parts?.[key] !== false;
