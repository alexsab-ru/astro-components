/** Small periodic prefixes/suffixes leave room for dragging and a full visible frame. */
export function carouselBuffer(widths, viewport, gap = 10) {
	if (widths.length < 2) return { before: [], after: [] };
	const sizes = widths.map((w) => (Number.isFinite(w) && w > 0 ? w : 1));
	const spacing = Math.max(0, Number(gap) || 0);
	const target = Math.max(0, Number(viewport) || 0) * 2 + Math.max(...sizes);
	const before = [],
		after = [];
	let covered = 0,
		index = 0;
	while (covered < target) {
		const source = sizes.length - 1 - (index % sizes.length);
		before.unshift(source);
		covered += sizes[source] + spacing;
		index++;
	}
	covered = 0;
	index = 0;
	while (covered < target) {
		const source = index % sizes.length;
		after.push(source);
		covered += sizes[source] + spacing;
		index++;
	}
	return { before, after };
}
