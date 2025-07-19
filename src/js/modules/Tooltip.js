class Tooltip {
	constructor() {
		this.tooltips = document.querySelectorAll('.tooltip-icon');
		this.disclaimer = document.querySelector('.tooltip');
		this.disclaimerContent = this.disclaimer.querySelector('.tooltip-content');
		this.closeButton = document.querySelector('.tooltip-close');
		this.isLocked = false; // если true — тултип остаётся открытым после клика

		this.screenPadding = 20;
		this.spacing = 10;

		if (this.tooltips.length && this.disclaimer) {
			this.bindEvents();
			this.updateMobileClass();
			window.addEventListener('resize', this.updateMobileClass.bind(this));
		}
	}

	bindEvents() {
		this.tooltips.forEach(tooltip => {

            const style = window.getComputedStyle(tooltip.parentElement);
            const fontSize = style.fontSize.replace(/[^0-9]/g,"");
            const tHieght = parseInt(fontSize) <= 20 ? 25 : parseInt(fontSize);
            tooltip.style.setProperty('--size', `${tHieght}px`);

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
        });

        // Клик вне зоны — закрывает
        document.addEventListener('click', (e) => {
            if (
                !e.target.closest('.tooltip') &&
                !e.target.closest('.tooltip-icon')
            ) {
                this.hideTooltip();
            }
        });

        // Esc — закрывает
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideTooltip();
            }
        });

        // Кнопка закрытия
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => {
                this.hideTooltip();
            });
        }

        // Закрытие при ресайзе
        window.addEventListener('resize', () => {
            this.updateMobileClass();
            this.hideTooltip();
        });

        // Закрытие при скролле
        window.addEventListener('scroll', () => {
            this.hideTooltip();
        });
	}

	updateMobileClass() {
		if (!this.disclaimer) return;

		const isMobile = window.innerWidth <= 768;
		this.disclaimer.classList.toggle('mobile', isMobile);
	}

	showTooltip(tooltip) {
		const text = tooltip.dataset.text;
		if (!text) return;

		this.disclaimerContent.innerHTML = text;
		this.disclaimer.style.display = 'block';
		this.disclaimer.classList.add('active');

		// пересчитываем позицию после отрисовки
		requestAnimationFrame(() => {
			const tooltipRect = tooltip.getBoundingClientRect();
			const disclaimerRect = this.disclaimer.getBoundingClientRect();
			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight;

			let left = tooltipRect.left + tooltipRect.width / 2 - disclaimerRect.width / 2;
			let top = tooltipRect.bottom + this.spacing;

			// Корректировка по горизонтали
			if (left + disclaimerRect.width > viewportWidth - this.screenPadding) {
				left = viewportWidth - disclaimerRect.width - this.screenPadding;
			}
			if (left < this.screenPadding) {
				left = this.screenPadding;
			}

			// Корректировка по вертикали
			if (tooltipRect.bottom + disclaimerRect.height + this.spacing > viewportHeight) {
				top = tooltipRect.top - disclaimerRect.height - this.spacing;
			}
			if (top < this.screenPadding) {
				top = this.screenPadding;
			}

			this.disclaimer.style.left = `${left}px`;
			this.disclaimer.style.top = `${top}px`;
		});
	}

	hideTooltip() {
		this.isLocked = false;
		this.disclaimer.classList.remove('active');
		this.disclaimer.style.display = 'none';
	}
}

export default Tooltip;