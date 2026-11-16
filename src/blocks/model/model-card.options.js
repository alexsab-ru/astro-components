// Explicit component props override model/brand data. Unknown values preserve
// the original, separate brand line rather than changing other brands' cards.
export function resolveBrandPlacement(brandPlacement, model) {
	const placement = brandPlacement ?? model?.card?.brandPlacement;
	return placement === 'inline' ? 'inline' : 'separate';
}
