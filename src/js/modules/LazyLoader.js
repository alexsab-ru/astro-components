const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 500;

class LazyLoader {
	constructor(selector = '.lazy', options = { rootMargin: '200px 0px', threshold: 0 }) {
		this.elements = document.querySelectorAll(selector);
		this.states = new WeakMap();
		this.failed = new Set();
		this.observer = typeof IntersectionObserver === 'function'
			? new IntersectionObserver(this.handleIntersect.bind(this), options)
			: null;
		this.init();
		window.addEventListener('online', () => {
			for (const media of this.failed) {
				this.states.get(media).attempts = 0;
				this.load(media);
			}
		});
	}

	hasDeferredSource(media) {
		return Boolean(media.dataset.src?.trim()) || (
			media.tagName === 'VIDEO' &&
			Array.from(media.querySelectorAll('source[data-src]'))
				.some((source) => source.dataset.src?.trim())
		);
	}

	init() {
		const seen = new Set();
		for (const wrapper of this.elements) {
			for (const media of wrapper.querySelectorAll('img, video')) {
				if (seen.has(media) || !this.hasDeferredSource(media)) continue;
				seen.add(media);
				this.states.set(media, { loading: false, attempts: 0 });
				if (media.dataset.loaded === 'true') continue;
				if (this.observer) this.observer.observe(media);
				else this.load(media);
			}
			this.releaseWrapper(wrapper);
		}
	}

	releaseWrapper(wrapper) {
		if (!wrapper) return;
		const pending = Array.from(wrapper.querySelectorAll('img, video'))
			.some((media) => this.hasDeferredSource(media) && media.dataset.loaded !== 'true');
		if (!pending) wrapper.classList.remove('lazy');
	}

	load(media) {
		const state = this.states.get(media);
		if (!state || state.loading || state.attempts >= MAX_ATTEMPTS || media.dataset.loaded === 'true') return;
		state.loading = true;
		state.attempts += 1;
		const loadedEvent = media.tagName === 'VIDEO' ? 'loadedmetadata' : 'load';
		const cleanup = () => {
			media.removeEventListener(loadedEvent, onLoad);
			media.removeEventListener('error', onError);
			state.loading = false;
		};
		const onLoad = () => {
			cleanup();
			media.dataset.loaded = 'true';
			delete media.dataset.loadError;
			this.failed.delete(media);
			media.classList.remove('opacity-0');
			this.releaseWrapper(media.closest('.lazy'));
			this.observer?.unobserve(media);
		};
		const onError = () => {
			cleanup();
			media.dataset.loadError = 'true';
			this.failed.add(media);
			if (state.attempts < MAX_ATTEMPTS) {
				setTimeout(() => this.load(media), RETRY_DELAY_MS);
			}
		};
		// Register before changing src: cached images can finish immediately.
		media.addEventListener(loadedEvent, onLoad);
		media.addEventListener('error', onError);
		if (media.tagName === 'VIDEO') {
			for (const source of media.querySelectorAll('source[data-src]')) {
				if (source.dataset.src?.trim()) source.src = source.dataset.src;
			}
			if (media.dataset.src?.trim()) media.src = media.dataset.src;
			media.load();
		} else {
			media.src = media.dataset.src;
			if (media.complete && media.naturalWidth > 0) onLoad();
		}
	}

	handleIntersect(entries) {
		for (const entry of entries) {
			if (entry.isIntersecting) this.load(entry.target);
		}
	}
}

export default LazyLoader;
