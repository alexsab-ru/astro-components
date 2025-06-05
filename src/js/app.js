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
