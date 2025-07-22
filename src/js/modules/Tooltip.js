class Tooltip {
	constructor() {
		this.tooltips = document.querySelectorAll('.tooltip-icon');
		this.disclaimer = document.querySelector('.tooltip');
		this.disclaimerContent = this.disclaimer?.querySelector('.tooltip-content');
		this.closeButton = document.querySelector('.tooltip-close');
		this.isLocked = false;
		this.activeTooltip = null;

		this.screenPadding = 20;
		this.spacing = 10;

		if (this.tooltips.length && this.disclaimer && this.disclaimerContent) {
			this.bindEvents();
			this.updateMobileClass();
			window.addEventListener('resize', this.debounce(this.handleResize.bind(this), 100));
		}
	}

	bindEvents() {
		this.tooltips.forEach(tooltip => {
			this.setupTooltipSize(tooltip);
			this.attachTooltipEvents(tooltip);
		});

		this.attachGlobalEvents();
	}

	setupTooltipSize(tooltip) {
		const style = window.getComputedStyle(tooltip.parentElement);
		const fontSize = parseInt(style.fontSize, 10) || 16;
		const tooltipHeight = fontSize <= 20 ? 25 : fontSize;
		tooltip.style.setProperty('--size', `${tooltipHeight}px`);
	}

	attachTooltipEvents(tooltip) {
		tooltip.addEventListener('mouseenter', () => {
			if (!this.isLocked) this.showTooltip(tooltip);
		});

		tooltip.addEventListener('mouseleave', () => {
			if (!this.isLocked) this.hideTooltip();
		});

		tooltip.addEventListener('click', (e) => {
			e.stopPropagation();
			this.isLocked = true;
			this.showTooltip(tooltip);
		});
	}

	attachGlobalEvents() {
		// Клик вне области
		document.addEventListener('click', (e) => {
			if (!e.target.closest('.tooltip') && !e.target.closest('.tooltip-icon')) {
				this.hideTooltip();
			}
		});

		// Escape key
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') {
				this.hideTooltip();
			}
		});

		// Кнопка закрытия
		this.closeButton?.addEventListener('click', () => {
			this.hideTooltip();
		});

		// Скролл
		window.addEventListener('scroll', this.debounce(() => {
			this.hideTooltip();
		}, 50));
	}

	handleResize() {
		this.updateMobileClass();
		this.hideTooltip();
	}

	updateMobileClass() {
		if (!this.disclaimer) return;

		const isMobile = window.innerWidth <= 768;
		this.disclaimer.classList.toggle('mobile', isMobile);
	}

	showTooltip(tooltip) {
		const text = tooltip.dataset.text;
		if (!text || !this.disclaimerContent) return;

		// Если показываем тот же тултип, не делаем ничего
		if (this.activeTooltip === tooltip && this.disclaimer.classList.contains('active')) {
			return;
		}

		this.activeTooltip = tooltip;
		this.disclaimerContent.innerHTML = this.sanitizeHTML(text);
		this.disclaimer.style.display = 'block';
		
		// Позиционирование после рендера
		requestAnimationFrame(() => {
			this.positionTooltip(tooltip);
			this.disclaimer.classList.add('active');
		});
	}

	positionTooltip(tooltip) {
		const tooltipRect = tooltip.getBoundingClientRect();
		const disclaimerRect = this.disclaimer.getBoundingClientRect();
		const viewport = {
			width: window.innerWidth,
			height: window.innerHeight
		};

		let position = this.calculatePosition(tooltipRect, disclaimerRect, viewport);
		
		this.disclaimer.style.left = `${position.left}px`;
		this.disclaimer.style.top = `${position.top}px`;
	}

	calculatePosition(tooltipRect, disclaimerRect, viewport) {
		let left = tooltipRect.left + tooltipRect.width / 2 - disclaimerRect.width / 2;
		let top = tooltipRect.bottom + this.spacing;

		// Горизонтальная корректировка
		const rightOverflow = left + disclaimerRect.width - (viewport.width - this.screenPadding);
		if (rightOverflow > 0) {
			left -= rightOverflow;
		}
		left = Math.max(left, this.screenPadding);

		// Вертикальная корректировка
		const bottomOverflow = top + disclaimerRect.height - viewport.height;
		if (bottomOverflow > 0) {
			// Попробуем показать сверху
			const topPosition = tooltipRect.top - disclaimerRect.height - this.spacing;
			top = topPosition >= this.screenPadding ? topPosition : this.screenPadding;
		}

		return { left, top };
	}

	hideTooltip() {
		if (!this.disclaimer.classList.contains('active')) return;
		
		this.isLocked = false;
		this.activeTooltip = null;
		this.disclaimer.classList.remove('active');
		
		// Скрываем после анимации
		setTimeout(() => {
			if (!this.disclaimer.classList.contains('active')) {
				this.disclaimer.style.display = 'none';
			}
		}, 300);
	}

	// Базовая санитизация HTML
	sanitizeHTML(html) {
		const div = document.createElement('div');
		div.textContent = html;
		return div.innerHTML;
	}

	// Debounce для оптимизации событий
	debounce(func, wait) {
		let timeout;
		return function executedFunction(...args) {
			const later = () => {
				clearTimeout(timeout);
				func(...args);
			};
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
		};
	}

	// Метод для программного управления
	destroy() {
		window.removeEventListener('resize', this.handleResize);
		window.removeEventListener('scroll', this.hideTooltip);
		this.hideTooltip();
	}
}

export default Tooltip;