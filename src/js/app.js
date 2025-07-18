import './data.alpine';
import './modules/scroll';
import './modules/modals';
import './modules/latest.posts';
import './modules/stock-slider';

import ResponsiveMenu from './modules/ResponsiveMenu';

import LazyLoader from './modules/LazyLoader';

import { connectForms, cookiecook, startNoBounce, initPersistCampaignData } from '@alexsab-ru/scripts';

startNoBounce();
initPersistCampaignData();
cookiecook();

// Wait for window._dp to be available before connecting forms
const waitForDp = setInterval(() => {
	if (window._dp && window._dp.connectforms_link) {
		clearInterval(waitForDp);
		connectForms(window._dp.connectforms_link, {
			confirmModalText: 'Вы уже оставляли заявку сегодня, с Вами обязательно свяжутся в ближайшее время!',
		});
	}
}, 100); // Check every 100ms


document.addEventListener('DOMContentLoaded', () => {
	new ResponsiveMenu('#site_nav ul');
	new LazyLoader();

	const tooltips = document.querySelectorAll('.ui-disclaimer-icon');
	const disclaimerBlock = document.querySelector('.ui-disclaimer');

	function updateDisclaimerMobileClass() {
		if (!disclaimerBlock) return;

		const isMobile = () => /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent) || window.innerWidth <= 768;

		if (isMobile()) {
			disclaimerBlock.classList.add('mobile');
		} else {
			disclaimerBlock.classList.remove('mobile');
		}
	}

	updateDisclaimerMobileClass();
	window.addEventListener('resize', updateDisclaimerMobileClass);

	if (tooltips.length && disclaimerBlock) {
		tooltips.forEach(tooltip => {
			tooltip.addEventListener('mouseenter', () => {
				const text = tooltip.dataset.text;
				if (!text) return;

				disclaimerBlock.innerHTML = text;
				disclaimerBlock.style.display = 'block';
				disclaimerBlock.classList.add('active');

				// Отложим расчёт позиции до следующего кадра, чтобы DOM успел обновить размеры
				requestAnimationFrame(() => {
					const tooltipRect = tooltip.getBoundingClientRect();
					const disclaimerRect = disclaimerBlock.getBoundingClientRect();
					const viewportWidth = window.innerWidth;
					const viewportHeight = window.innerHeight;

					const spacing = 10; // отступ между иконкой и тултипом
					const screenPadding = 20; // отступ от краёв экрана

					let left = tooltipRect.left + tooltipRect.width / 2 - disclaimerRect.width / 2;
					let top = tooltipRect.bottom + spacing; // по умолчанию снизу
					let right = 'auto'; // по умолчанию снизу

					// Не выходит ли тултип за правый край
					if (left + disclaimerRect.width > viewportWidth - screenPadding) {
						left = viewportWidth - disclaimerRect.width - screenPadding;
						right = `${screenPadding}px`;
					}

					// Не выходит ли за левый край
					if (left < screenPadding) {
						left = screenPadding;
						right = `${screenPadding}px`;
					}

					// Если снизу не помещается — показываем сверху
					if (tooltipRect.bottom + disclaimerRect.height + spacing > viewportHeight) {
						top = tooltipRect.top - disclaimerRect.height - spacing;
					}

					// Если даже сверху не помещается — прижимаем к верху
					if (top < screenPadding) {
						top = screenPadding;
					}

					// Применяем позицию
					disclaimerBlock.style.left = `${left}px`;
					disclaimerBlock.style.right = right;
					disclaimerBlock.style.top = `${top}px`;
				});
			});

			tooltip.addEventListener('mouseleave', () => {
				disclaimerBlock.classList.remove('active');
				disclaimerBlock.style.display = 'none';
			});
		});
	}

});

import GLightbox from 'glightbox';
import 'glightbox/dist/css/glightbox.min.css';
const lightbox = GLightbox({
	moreLength: 0,
	loop: true,
	slideEffect: 'fade',
});

// Редирект, если в конце URL больше одного слеша
const path = window.location.pathname;
const regex = /\/{2,}$/;
if(regex.test(path)){
	window.location.href = path.replace(regex, '/');
}
const seoShowMoreBtns = document.querySelectorAll('.seo-show-more');
if(seoShowMoreBtns.length){
	Array.from(seoShowMoreBtns).map(btn => {
		btn.addEventListener('click', function(e){
			e.preventDefault();
			const contentBlock = btn.closest('section').querySelector('.seo-content');
			btn.classList.toggle('active');
			contentBlock.classList.toggle('open');
			btn.querySelector('.seo-show-more-text').innerText = btn.classList.contains('active') ? 'скрыть' : 'читать полностью';
			if(!btn.classList.contains('active')){
				 contentBlock.scrollIntoView({ block: "start", behavior: "smooth" });
			}
		});
	});
}
