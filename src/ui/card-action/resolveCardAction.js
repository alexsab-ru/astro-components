const noAction = () => ({ type: 'none' });

function usableUrl(value) {
	if (typeof value !== 'string') return '';
	const href = value.trim();
	if (!href || href === '#') return '';
	try {
		const parsed = new URL(href, 'https://card-action.invalid');
		return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol) ? href : '';
	} catch {
		return '';
	}
}

function popupId(value) {
	if (typeof value !== 'string') return '';
	const id = value.trim().replace(/^#/, '');
	return id && !/[\s#/?\\]/.test(id) ? id : '';
}

/** Exact legacy modal fragments only: #section and external URL hashes are links. */
export function legacyPopupId(url) {
	return typeof url === 'string' && /^#common-modal(?:-[\w-]+)?$/.test(url.trim())
		? url.trim().slice(1)
		: '';
}

/** @returns {import('./types').ResolvedCardAction} */
export function resolveCardAction(source = {}) {
	if (!source || typeof source !== 'object') return noAction();
	const explicit = source.action;
	if (explicit?.type === 'none') return noAction();
	if (explicit && !['popup', 'link', 'new-tab'].includes(explicit.type)) return noAction();
	const legacyId = explicit ? '' : legacyPopupId(source.url);
	if (explicit?.type === 'popup' || legacyId) {
		const id = popupId(explicit?.id ?? (legacyId || 'common-modal'));
		if (!id) return noAction();
		const popup = { title: source.title };
		for (const key of ['title', 'subtitle', 'formName', 'comment', 'chooseDepartment', 'filtering', 'sorting', 'dealerName']) {
			if (explicit?.[key] !== undefined) popup[key] = explicit[key];
		}
		return { type: 'popup', id, href: '#' + id, popup };
	}
	const href = usableUrl(explicit ? explicit.url : source.url);
	if (!href) return noAction();
	const target = explicit?.type === 'new-tab' ? '_blank' : explicit ? explicit.target : source.target;
	const rel = explicit ? explicit.rel : source.rel;
	const opensNewTab = target === '_blank';
	const relTokens = [...new Set((rel || '').split(/\s+/).filter(Boolean))];
	if (opensNewTab) {
		for (const token of ['noopener', 'noreferrer']) {
			if (!relTokens.some(value => value.toLowerCase() === token)) relTokens.push(token);
		}
	}
	return {
		type: opensNewTab ? 'new-tab' : 'link',
		href,
		target: target || undefined,
		rel: relTokens.join(' ') || undefined,
	};
}
