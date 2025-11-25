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

		// Сохраняем ссылки на дебаунс-обработчики
		this.handleResizeDebounced = this.debounce(() => {
			requestAnimationFrame(() => {
				this.handleResize();
			});
		}, 100);

		this.handleScrollDebounced = this.debounce(() => {
			this.hideTooltip();
		}, 50);

		if (this.tooltips.length && this.disclaimer && this.disclaimerContent) {
			this.bindEvents();
			this.updateMobileClass();
			window.addEventListener('resize', this.handleResizeDebounced);
			window.addEventListener('orientationchange', this.handleResizeDebounced);
			window.addEventListener('scroll', this.handleScrollDebounced);
		}
	}

	// Первичная инициализация
	bindEvents() {
		this.tooltips.forEach(tooltip => {
			this.setupTooltipSize(tooltip);
		});
		this.updateTooltipEventMode(); // навешиваем события в зависимости от режима
		this.attachGlobalEvents();
	}

	// Настраиваем размер иконки тултипа
	setupTooltipSize(tooltip) {
		const style = window.getComputedStyle(tooltip.parentElement);
		const fontSize = parseInt(style.fontSize, 10) || 16;
		const tooltipHeight = fontSize < 20 ? 22 : fontSize > 30 ? 30 : fontSize;
		tooltip.style.setProperty('--size', `${tooltipHeight}px`);
	}

	// Проверка на мобильное устройство/ширину
	isMobile() {
		return (
			window.innerWidth <= 768 ||
			('ontouchstart' in window) ||
			(navigator.maxTouchPoints > 0)
		);
	}

	// Пересоздаём события тултипов при смене режима
	updateTooltipEventMode() {
		// Удаляем все старые слушатели через клонирование элементов
		this.tooltips.forEach(tooltip => {
			const newTooltip = tooltip.cloneNode(true);
			tooltip.parentNode.replaceChild(newTooltip, tooltip);
		});

		// Обновляем ссылку на новые элементы
		this.tooltips = document.querySelectorAll('.tooltip-icon');

		this.tooltips.forEach(tooltip => {
			this.setupTooltipSize(tooltip);

			// Навешиваем hover только для десктопа
			if (!this.isMobile()) {
				tooltip.addEventListener('mouseenter', () => {
					if (!this.isLocked) this.showTooltip(tooltip);
				});
				tooltip.addEventListener('mouseleave', () => {
					if (!this.isLocked) this.hideTooltip();
				});
			}

			// Click работает всегда
			tooltip.addEventListener('click', (e) => {
				e.stopPropagation();
				this.isLocked = true;
				this.showTooltip(tooltip);
			});
		});
	}

	// Глобальные события
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
	}

	// Обработчик ресайза/поворота экрана
	handleResize() {
		this.updateMobileClass();
		this.updateTooltipEventMode(); // пересоздаём события
		this.hideTooltip();
	}

	// Обновляем класс mobile
	updateMobileClass() {
		if (!this.disclaimer) return;
		this.disclaimer.classList.toggle('mobile', this.isMobile());
	}

	// Показ тултипа
	showTooltip(tooltip) {
		const text = tooltip.dataset.text;
		if (!text || !this.disclaimerContent) return;

		if (this.activeTooltip === tooltip && this.disclaimer.classList.contains('active')) {
			return;
		}

		this.activeTooltip = tooltip;
		this.disclaimerContent.innerHTML = this.sanitizeHTML(text);
		this.disclaimer.style.display = 'block';

		requestAnimationFrame(() => {
			this.positionTooltip(tooltip);
			this.disclaimer.classList.add('active');
		});
	}

	// Позиционирование тултипа
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

	// Вычисление позиции
	calculatePosition(tooltipRect, disclaimerRect, viewport) {
		let left = tooltipRect.left + tooltipRect.width / 2 - disclaimerRect.width / 2;
		let top = tooltipRect.bottom + this.spacing;

		const rightOverflow = left + disclaimerRect.width - (viewport.width - this.screenPadding);
		if (rightOverflow > 0) {
			left -= rightOverflow;
		}
		left = Math.max(left, this.screenPadding);

		const bottomOverflow = top + disclaimerRect.height - viewport.height;
		if (bottomOverflow > 0) {
			const topPosition = tooltipRect.top - disclaimerRect.height - this.spacing;
			top = topPosition >= this.screenPadding ? topPosition : this.screenPadding;
		}

		return { left, top };
	}

	// Скрытие тултипа
	hideTooltip() {
		if (!this.disclaimer.classList.contains('active')) return;

		this.isLocked = false;
		this.activeTooltip = null;
		this.disclaimer.classList.remove('active');

		setTimeout(() => {
			if (!this.disclaimer.classList.contains('active')) {
				this.disclaimer.style.display = 'none';
			}
		}, 100);
	}

	// Очистка HTML
	sanitizeHTML(html) {
		const div = document.createElement('div');
		return div.innerHTML = html;
	}

	// Debounce
	debounce(func, wait) {
		let timeout;
		return (...args) => {
			clearTimeout(timeout);
			timeout = setTimeout(() => func(...args), wait);
		};
	}

	// Уничтожение
	destroy() {
		window.removeEventListener('resize', this.handleResizeDebounced);
		window.removeEventListener('orientationchange', this.handleResizeDebounced);
		window.removeEventListener('scroll', this.handleScrollDebounced);
		this.hideTooltip();
	}
}

export default Tooltip;
