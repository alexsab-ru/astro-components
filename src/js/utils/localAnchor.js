/** Return the anchor only when a link stays on the current document. */
export function getLocalAnchorId(href, currentUrl) {
	try {
		const current = new URL(currentUrl);
		const target = new URL(href, current);
		if (target.origin !== current.origin || target.pathname !== current.pathname || target.search !== current.search || !target.hash) return null;
		return decodeURIComponent(target.hash.slice(1));
	} catch {
		return null;
	}
}
