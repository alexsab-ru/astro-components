export const MODEL_PART_ORDER = [
	'hero',
	'colors',
	'media',
	'characteristics',
	'actions',
];
/** Move specified parts first; keep unspecified parts in their original order. */
export function resolveModelOrder(order, defaults = MODEL_PART_ORDER) {
	const requested = Array.isArray(order)
		? order.filter((key) => defaults.includes(key))
		: [];
	return [...new Set([...requested, ...defaults])];
}

export const isModelPartVisible = (parts, key) => parts?.[key] !== false;
