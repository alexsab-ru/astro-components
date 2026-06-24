function normalizeOrigin(origin) {
	if (!origin) return '';
	try {
		return new URL(origin.startsWith('http') ? origin : `https://${origin}`).origin;
	} catch {
		return '';
	}
}

function resolveAbsoluteUrl(href, siteOrigin) {
	try {
		return new URL(href, siteOrigin || 'https://example.com');
	} catch {
		return null;
	}
}

export function resolveBannerLink(banner = {}, options = {}) {
	const href = banner.url?.trim();
	if (!href) return null;

	const isPopup = href.toLowerCase().includes('#common-modal');
	if (isPopup) {
		return {
			href,
			isExternal: false,
			isPopup: true,
			target: undefined,
			rel: undefined,
		};
	}

	const siteOrigin = normalizeOrigin(options.siteOrigin);
	const url = resolveAbsoluteUrl(href, siteOrigin);
	const isHttp = url?.protocol === 'http:' || url?.protocol === 'https:';
	const isAbsoluteHttp = /^https?:\/\//i.test(href);
	const isExternal = Boolean(isAbsoluteHttp && (!siteOrigin || url?.origin !== siteOrigin));
	const localHref = isAbsoluteHttp && !isExternal && url ? `${url.pathname}${url.search}${url.hash}` : href;

	return {
		href: localHref,
		isExternal,
		isPopup: false,
		target: isHttp && isExternal ? '_blank' : undefined,
		rel: isHttp && isExternal ? 'noopener noreferrer' : undefined,
	};
}
