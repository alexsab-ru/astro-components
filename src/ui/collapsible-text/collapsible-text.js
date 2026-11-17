/** Shared state and scrolling; each wrapper keeps its own content and trigger. */
export class CollapsibleText extends HTMLElement {
	connectedCallback() {
		this.content = this.querySelector(':scope > [data-collapse-content]');
		this.button = this.querySelector(':scope > div > [data-collapse-toggle]');
		if (!this.content || !this.button) return;
		this.label = this.button.querySelector('[data-collapse-label]');
		this.onClick = () => this.setExpanded(this.dataset.expanded !== 'true', true);
		this.button.addEventListener('click', this.onClick);
		this.setExpanded(this.dataset.expanded === 'true');
		this.button.hidden = false;
	}

	disconnectedCallback() {
		this.button?.removeEventListener('click', this.onClick);
		cancelAnimationFrame(this.scrollFrame);
	}

	setExpanded(expanded, scroll = false) {
		this.dataset.expanded = String(expanded);
		this.button.setAttribute('aria-expanded', String(expanded));
		this.label.textContent = expanded ? this.dataset.collapseLabel : this.dataset.expandLabel;
		this.button.classList.toggle('active', expanded);
		// RichContentMore historically applies SEO typography only while collapsed.
		if (this.dataset.variant === 'rich') this.content.classList.toggle('seo-content', !expanded);
		cancelAnimationFrame(this.scrollFrame);
		if (!scroll || this.dataset.variant === 'rich' || (this.dataset.variant === 'seo' && expanded)) return;
		this.scrollFrame = requestAnimationFrame(() => {
			const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
			if (this.dataset.variant === 'seo') {
				this.content.scrollIntoView({ block: 'start', behavior });
			} else {
				// Preserve the footer's header offset; the scroll target is this instance.
				const header = document.getElementById('site_nav');
				window.scrollBy({ top: this.getBoundingClientRect().top - (header?.offsetHeight || 0), behavior });
			}
		});
	}
}

if (!customElements.get('collapsible-text')) customElements.define('collapsible-text', CollapsibleText);
