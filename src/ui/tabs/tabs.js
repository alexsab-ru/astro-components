/** Each instance owns its navigation, media and panels, including when nested. */
export class ContentTabs extends HTMLElement {
	connectedCallback() {
		this.list = this.querySelector(':scope > [data-tabs-list]');
		this.content = this.querySelector(':scope > [data-tabs-content]');
		this.tabs = [...this.list.querySelectorAll(':scope > [role="tab"]')];
		this.panels = [...this.content.querySelectorAll(':scope > [data-tabs-panel]')];
		this.media = this.content.querySelector(':scope > [data-tabs-media]');
		this.image = this.media?.querySelector('[data-tabs-image]');
		this.onClick = event => {
			const tab = event.target.closest('[role="tab"]');
			if (this.tabs.includes(tab)) this.activate(this.tabs.indexOf(tab), true);
		};
		this.onKeydown = event => {
			const index = this.tabs.indexOf(event.target);
			if (index < 0) return;
			const next = nextTabIndex(event.key, index, this.tabs.length);
			if (next === null) return;
			event.preventDefault();
			this.activate(next);
			this.tabs[next].focus();
			// Reveal the focus ring too when the horizontal strip overflows.
			this.tabs[next].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
		};
		this.list.addEventListener('click', this.onClick);
		this.list.addEventListener('keydown', this.onKeydown);
		this.activate(Number(this.dataset.initial));
		this.list.hidden = false;
	}

	disconnectedCallback() {
		this.list?.removeEventListener('click', this.onClick);
		this.list?.removeEventListener('keydown', this.onKeydown);
		cancelAnimationFrame(this.scrollFrame);
	}

	activate(index, scroll = false) {
		this.dataset.initial = String(index);
		this.tabs.forEach((tab, current) => {
			const selected = current === index;
			tab.setAttribute('aria-selected', String(selected));
			tab.tabIndex = selected ? 0 : -1;
			this.panels[current].hidden = !selected;
		});
		if (this.image) {
			const image = this.tabs[index].dataset;
			this.media.hidden = !image.imageSrc;
			if (image.imageSrc) {
				this.image.src = image.imageSrc;
				this.image.alt = image.imageAlt || '';
				for (const size of ['width', 'height']) {
					const value = image[`image${size[0].toUpperCase()}${size.slice(1)}`];
					if (value) this.image.setAttribute(size, value);
					else this.image.removeAttribute(size);
				}
			}
		}
		if (scroll && this.dataset.scroll === 'true') {
			cancelAnimationFrame(this.scrollFrame);
			this.scrollFrame = requestAnimationFrame(() => {
				this.content.scrollIntoView({
					behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
					block: 'start',
				});
			});
		}
	}
}

export function nextTabIndex(key, index, count) {
	if (key === 'ArrowRight') return (index + 1) % count;
	if (key === 'ArrowLeft') return (index + count - 1) % count;
	if (key === 'Home') return 0;
	if (key === 'End') return count - 1;
	return null;
}

if (!customElements.get('content-tabs')) customElements.define('content-tabs', ContentTabs);
