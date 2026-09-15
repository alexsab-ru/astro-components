/**
 * Shuffle children of a .random-dealer block on each page load.
 * Used wherever more than one salon is listed (header, slide-out, footer),
 * so the top/bottom order is not always the same dealer.
 */

/**
 * Fisher-Yates shuffle of a parent's child nodes, then re-append them.
 * `random` is injectable so tests can pin a known permutation.
 */
export function shuffleChildOrder(root, random = Math.random) {
	if (!root) return;

	const items = Array.from(root.children);
	if (items.length < 2) return;

	for (let i = items.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[items[i], items[j]] = [items[j], items[i]];
	}

	items.forEach((item) => root.appendChild(item));
}

/**
 * Find every .random-dealer under `scope` and shuffle its direct children.
 */
export function shuffleRandomDealers(scope = document, random = Math.random) {
	if (!scope?.querySelectorAll) return;

	scope.querySelectorAll('.random-dealer').forEach((root) => {
		shuffleChildOrder(root, random);
	});
}
