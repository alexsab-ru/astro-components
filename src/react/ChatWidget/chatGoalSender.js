export function getChatMetrikaCounterIds(metrika, production) {
	if (!metrika) return [];
	if (!production) return [48905003];
	const counters = Array.isArray(metrika.value) ? metrika.value : [];
	if (!counters[0]?.id || String(counters[0].id) === '') return [];
	const ids = counters.map((counter) => Number(counter?.id))
		.filter((id) => Number.isSafeInteger(id) && id > 0);
	return [...new Set([...ids, 94754424])];
}

export function isChatAnalyticsReady(browserWindow = globalThis.window, requiredCounterIds = []) {
	if (!browserWindow) return false;
	if (browserWindow.dataLayer?.[0]?.event === 'gtm.js' || browserWindow.isGTMInstalled === true) return true;
	if (requiredCounterIds.length === 0) {
		const ga4 = browserWindow.dataLayer?.some((entry) => entry?.[0] === 'config' && String(entry[1]).startsWith('G-'));
		const tmr = browserWindow._tmr?.some((entry) => entry?.type === 'pageView' && entry.id);
		if (ga4 || tmr) return true;
	}
	try {
		const counters = browserWindow.Ya?._metrika?.getCounters?.() || [];
		const initialized = new Set(counters.map((counter) => String(counter.id)));
		return typeof browserWindow.ym === 'function' && initialized.size > 0 &&
			requiredCounterIds.every((id) => initialized.has(String(id)));
	} catch {
		return false;
	}
}

/** Keep early goals in order until the existing analytics route is ready. */
export function createChatGoalSender(loadScripts, {
	isReady = isChatAnalyticsReady,
	timeoutMs = 15000,
	pollMs = 100,
	onError = (code) => console.error(`Chat analytics: ${code}`),
} = {}) {
	const queue = [];
	let draining = false;
	async function drain() {
		draining = true;
		try {
			const { reachGoal } = await loadScripts();
			const deadline = Date.now() + timeoutMs;
			while (!isReady()) {
				if (Date.now() >= deadline) throw new Error('analytics_not_ready');
				await new Promise((resolve) => setTimeout(resolve, pollMs));
			}
			while (queue.length) {
				const item = queue.shift();
				try {
					reachGoal(item.goal, item.params);
					item.resolve(true);
				} catch {
					item.resolve(false);
					onError('goal_send_failed');
				}
			}
		} catch {
			for (const item of queue.splice(0)) item.resolve(false);
			onError('analytics_unavailable');
		} finally {
			draining = false;
		}
	}
	return (goal, params = {}) => new Promise((resolve) => {
		queue.push({ goal, params: { ...params }, resolve });
		if (!draining) void drain();
	});
}
