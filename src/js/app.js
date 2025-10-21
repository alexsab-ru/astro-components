import './data.alpine';
import './modules/scroll';
import './modules/modals';
import './modules/latest.posts';
import './modules/stock-slider';

import ResponsiveMenu from './modules/ResponsiveMenu';

import LazyLoader from './modules/LazyLoader';

import Tooltip from './modules/Tooltip';

import FormsValidation from './modules/FormsValidation';

// Импортируем нашу расширенную систему отслеживания форм
import connectFormsWithTracking from './modules/ConnectFormsWrapper';
import { formsIntegration } from './modules/EnhancedFormsIntegration';
import FormTrackingDebug from './utils/FormTrackingDebug';

import { cookiecook, startNoBounce, initPersistCampaignData } from '@alexsab-ru/scripts';

startNoBounce();
initPersistCampaignData();
cookiecook();

// Инициализируем систему отслеживания активности пользователя
// Это запустит отслеживание визитов и подготовит систему блокировки
formsIntegration.integrate();

// Добавляем debug-утилиту ТОЛЬКО в development (не на production!)
// Проверяем окружение: localhost, 127.0.0.1 или import.meta.env.DEV
if (typeof window !== 'undefined') {
	const isDevelopment = 
		window.location.hostname === 'localhost' || 
		window.location.hostname === '127.0.0.1' ||
		window.location.hostname.includes('192.168.') || // локальная сеть
		window.location.hostname.endsWith('.local') ||   // .local домены
		(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV); // Vite/Astro dev mode
	
	if (isDevelopment) {
		// Debug-утилиты доступны ТОЛЬКО в development
		window.formDebug = new FormTrackingDebug(formsIntegration);
		window.formsIntegration = formsIntegration; // для прямого доступа к интеграции
		console.log('💡 [DEV] Form Tracking Debug доступен! Введите window.formDebug.help() для справки');
	} else {
		// На production debug НЕ доступен, но можно оставить базовую информацию
		console.log('Form tracking system initialized');
	}
}

// Wait for window._dp to be available before connecting forms
const waitForDp = setInterval(() => {
	if (window._dp && window._dp.connectforms_link) {
		clearInterval(waitForDp);
		
		// Используем обертку connectFormsWithTracking вместо стандартного connectForms
		// Она автоматически добавит данные активности и обработает успешные отправки
		connectFormsWithTracking(window._dp.connectforms_link, {
			confirmModalText: 'Вы уже оставляли заявку сегодня, с Вами обязательно свяжутся в ближайшее время!',
			validation: FormsValidation
		});
	}
}, 100); // Check every 100ms


document.addEventListener('DOMContentLoaded', () => {

	new ResponsiveMenu('#site_nav ul');
	
	new LazyLoader();

	new Tooltip();

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
