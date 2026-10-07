/** Resolve an explicitly pinned dealer. Invalid names must never route silently. */
export function resolvePageDealer(salons, dealerName) {
	if (!dealerName) return undefined;
	const matches = salons.filter((salon) => salon.name === dealerName);
	if (matches.length !== 1) {
		throw new Error(`Expected one dealer named "${dealerName}", found ${matches.length}`);
	}
	return matches[0];
}

export function scopeSalons(salons, pageDealer) {
	return pageDealer
		? salons.filter((salon) => salon.name === pageDealer.name)
		: salons;
}
