/** Instance-local disclosure, overflow detection and optional scrolling. */
export class CollapsibleText extends HTMLElement {
	connectedCallback() {
		this.content = this.querySelector(':scope > [data-collapse-content]');
		this.actions = this.querySelector(':scope > [data-collapse-actions]');
		this.button = this.actions?.querySelector('[data-collapse-toggle]');
		if (!this.content || !this.button) return;
		this.label = this.button.querySelector('[data-collapse-label]');
		this.collapsedClasses = (this.dataset.collapsedContentClass || '').split(/\s+/).filter(Boolean);
		this.expanded ??= false;
		this.onClick = () => this.setExpanded(!this.expanded, true);
		this.scheduleMeasure = () => {
			cancelAnimationFrame(this.measureFrame);
			this.measureFrame = requestAnimationFrame(() => {
				if (this.isConnected) this.updateOverflow();
			});
		};
		this.button.addEventListener('click', this.onClick);
		this.content.addEventListener('load', this.scheduleMeasure, true);
		// A breakpoint can change the cap even when a max-width box stays the same size.
		window.addEventListener('resize', this.scheduleMeasure);
		this.resizeObserver = new ResizeObserver(this.scheduleMeasure);
		this.mutationObserver = new MutationObserver(() => {
			this.observeSizes();
			this.scheduleMeasure();
		});
		this.mutationObserver.observe(this.content, { childList: true, subtree: true, characterData: true });
		this.updateOverflow();
		this.observeSizes();
		document.fonts?.addEventListener('loadingdone', this.scheduleMeasure);
		document.fonts?.ready.then(() => { if (this.isConnected) this.scheduleMeasure(); });
	}

	observeSizes() {
		this.resizeObserver.disconnect();
		for (const target of [this, this.content, ...this.content.children]) this.resizeObserver.observe(target);
	}

	disconnectedCallback() {
		this.button?.removeEventListener('click', this.onClick);
		this.content?.removeEventListener('load', this.scheduleMeasure, true);
		window.removeEventListener('resize', this.scheduleMeasure);
		this.resizeObserver?.disconnect();
		this.mutationObserver?.disconnect();
		document.fonts?.removeEventListener('loadingdone', this.scheduleMeasure);
		cancelAnimationFrame(this.measureFrame);
		cancelAnimationFrame(this.scrollFrame);
	}

	updateOverflow() {
		// Hidden panels are measured when ResizeObserver sees them become visible.
		if (!this.content.getBoundingClientRect().width) return;
		this.toggleCollapsedClasses(true);
		this.dataset.measuring = '';
		this.overflowing = this.content.scrollHeight > this.content.clientHeight + 1;
		delete this.dataset.measuring;
		this.dataset.overflow = String(this.overflowing);
		this.renderState();
	}

	toggleCollapsedClasses(collapsed) {
		for (const name of this.collapsedClasses) this.content.classList.toggle(name, collapsed);
	}

	renderState() {
		const expanded = !this.overflowing || this.expanded;
		this.dataset.expanded = String(expanded);
		this.button.setAttribute('aria-expanded', String(expanded));
		const label = expanded ? this.dataset.collapseLabel : this.dataset.expandLabel;
		if (this.label.textContent !== label) this.label.textContent = label;
		this.button.classList.toggle('active', expanded);
		this.toggleCollapsedClasses(!expanded);
		this.button.hidden = this.actions.hidden = !this.overflowing;
	}

	setExpanded(expanded, scroll = false) {
		this.expanded = expanded;
		this.renderState();
		cancelAnimationFrame(this.scrollFrame);
		if (!scroll || !this.overflowing || this.dataset.scroll === 'none' ||
			(this.dataset.scroll === 'collapse' && expanded)) return;
		this.scrollFrame = requestAnimationFrame(() => {
			const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
			const target = this.dataset.scrollTarget === 'root' ? this : this.content;
			const offset = this.dataset.scrollOffsetSelector && document.querySelector(this.dataset.scrollOffsetSelector);
			if (offset) window.scrollBy({ top: target.getBoundingClientRect().top - offset.offsetHeight, behavior });
			else target.scrollIntoView({ block: 'start', behavior });
		});
	}
}

if (!customElements.get('collapsible-text')) customElements.define('collapsible-text', CollapsibleText);
