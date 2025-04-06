import './data.alpine';
import './modules/scroll';
import './modules/modals';
import './modules/latest.posts';
import './modules/stock-slider';

import ResponsiveMenu from './modules/ResponsiveMenu';

import LazyLoader from './modules/LazyLoader';

import { connectForms, cookiecook } from '@alexsab-ru/scripts';
cookiecook();
connectForms('https://alexsab.ru/lead/test/', {
	confirmModalText: 'Вы уже оставляли заявку сегодня, с Вами обязательно свяжутся в ближайшее время!',
});

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

function executeRecaptcha() {
grecaptcha.ready(function() {
	grecaptcha.execute('6Lepfy4pAAAAAAGHFP655qNe6Bb_BcskklcxajC6', {action: 'open'}).then(function(token) {
		let formData = new FormData();
		formData.append('g-recaptcha-response', token);
		const params = new URLSearchParams([...formData]);
		fetch("https://alexsab.ru/lead/re/", {
			method: "POST",
			mode: "cors",
			cache: "no-cache",
			credentials: "same-origin",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: params,
		})
			.then((res) => res.json())
			.then((data) => {
				// console.log('Success:', data);
				window.re = data.data.response.success;
			})
			.catch((error) => {
				console.error('Error:', error);
			});
	});
});
}

// Проверяем, определена ли grecaptcha
if (typeof grecaptcha === "undefined") {
	// Если grecaptcha не определена, устанавливаем интервал для проверки
	var checkRecaptchaAvailability = setInterval(function() {
		if (typeof grecaptcha !== "undefined") {
			// Как только grecaptcha становится доступной, очищаем интервал
			clearInterval(checkRecaptchaAvailability);
			// Выполняем код с grecaptcha
			executeRecaptcha();
		}
	}, 1000); // Проверяем каждую секунду
} else {
	// Если grecaptcha уже доступна, просто выполняем код
	executeRecaptcha();
}

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
