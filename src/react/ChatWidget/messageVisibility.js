export const MESSAGE_VIEW_FRACTION = 0.5;
export const MESSAGE_VIEW_DURATION_MS = 500;

const clips = new Set(['auto', 'scroll', 'hidden', 'clip']);

/** Visible geometry includes the viewport and every clipping scroll ancestor. */
export function getVisibleMessageRect(element) {
	const doc = element.ownerDocument;
	const win = doc.defaultView;
	if (!element.isConnected || doc.visibilityState !== 'visible') return null;
	const rect = element.getBoundingClientRect();
	if (rect.width <= 0 || rect.height <= 0) return null;
	const viewport = win.visualViewport;
	let left = Math.max(rect.left, viewport?.offsetLeft || 0);
	let top = Math.max(rect.top, viewport?.offsetTop || 0);
	let right = Math.min(rect.right, (viewport?.offsetLeft || 0) + (viewport?.width || doc.documentElement.clientWidth));
	let bottom = Math.min(rect.bottom, (viewport?.offsetTop || 0) + (viewport?.height || doc.documentElement.clientHeight));
	let opacity = 1;
	for (let node = element; node; node = node.parentElement) {
		const style = win.getComputedStyle(node);
		if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return null;
		opacity *= Number.parseFloat(style.opacity || '1');
		if (opacity < 0.99) return null;
		if (node === element || node === doc.documentElement) continue;
		// Root overflow clips the viewport, already accounted for above, rather
		// than html's page-relative rectangle after the document has scrolled.
		if (node === doc.body) {
			const rootStyle = win.getComputedStyle(doc.documentElement);
			if (rootStyle.overflowX === 'visible' && rootStyle.overflowY === 'visible' &&
				(rootStyle.contain || 'none') === 'none' && (style.contain || 'none') === 'none') continue;
		}
		const bounds = node.getBoundingClientRect();
		if (clips.has(style.overflowX)) {
			left = Math.max(left, bounds.left + node.clientLeft);
			right = Math.min(right, bounds.left + node.clientLeft + node.clientWidth);
		}
		if (clips.has(style.overflowY)) {
			top = Math.max(top, bounds.top + node.clientTop);
			bottom = Math.min(bottom, bounds.top + node.clientTop + node.clientHeight);
		}
	}
	if (right <= left || bottom <= top) return null;
	const fraction = ((right - left) * (bottom - top)) / (rect.width * rect.height);
	return fraction >= MESSAGE_VIEW_FRACTION ? { left, top, right, bottom } : null;
}

export function isMessageVisible(element) {
	const rect = getVisibleMessageRect(element);
	if (!rect || typeof element.ownerDocument.elementFromPoint !== 'function') return false;
	// IntersectionObserver alone also counts content behind a modal. Check painted
	// targets inside the visible bubble; no message text or visitor data is read.
	const points = [[0.5, 0.5], [0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]];
	return points.every(([x, y]) => {
		const target = element.ownerDocument.elementFromPoint(
			rect.left + (rect.right - rect.left) * x,
			rect.top + (rect.bottom - rect.top) * y,
		);
		return target !== null && element.contains(target);
	});
}

/** Counts one continuous view after message rendering/animation has completed. */
export function observeMessageVisibility(element, onVisible) {
	const doc = element.ownerDocument;
	const win = doc.defaultView;
	let stopped = false;
	let timer = null;
	let visibleSince = null;
	let observer = null;
	let intersecting = typeof win.IntersectionObserver !== 'function';
	const stop = () => {
		if (stopped) return;
		stopped = true;
		win.clearTimeout(timer);
		observer?.disconnect();
		doc.removeEventListener('visibilitychange', check);
		win.removeEventListener('scroll', check, true);
		win.removeEventListener('resize', check);
		win.visualViewport?.removeEventListener('resize', check);
		win.visualViewport?.removeEventListener('scroll', check);
	};
	function check() {
		if (stopped) return;
		win.clearTimeout(timer);
		if (!element.isConnected) { stop(); return; }
		if (!intersecting || doc.visibilityState !== 'visible') {
			visibleSince = null;
			return;
		}
		const now = win.performance.now();
		if (isMessageVisible(element)) {
			visibleSince ??= now;
			if (now - visibleSince >= MESSAGE_VIEW_DURATION_MS) {
				stop();
				onVisible();
				return;
			}
		} else {
			visibleSince = null;
		}
		// Poll only near the viewport to detect overlays opening/closing even when
		// scroll geometry has not changed. Hidden tabs have no running timer.
		timer = win.setTimeout(check, 100);
	}
	if (typeof win.IntersectionObserver === 'function') {
		try {
			observer = new win.IntersectionObserver((entries) => {
				const entry = entries.find((candidate) => candidate.target === element);
				if (!entry) return;
				intersecting = entry.isIntersecting && entry.intersectionRatio >= MESSAGE_VIEW_FRACTION;
				check();
			}, { root: null, rootMargin: '0px', threshold: [0, MESSAGE_VIEW_FRACTION] });
			observer.observe(element);
		} catch {
			observer?.disconnect();
			observer = null;
			intersecting = true;
		}
	}
	doc.addEventListener('visibilitychange', check);
	win.addEventListener('scroll', check, { capture: true, passive: true });
	win.addEventListener('resize', check);
	win.visualViewport?.addEventListener('resize', check);
	win.visualViewport?.addEventListener('scroll', check);
	check();
	return stop;
}
