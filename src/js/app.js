import './data.alpine';
import './modules/scroll';
import './modules/modals';

import { connectForms, cookiecook } from '@alexsab-ru/scripts';
cookiecook();
connectForms('https://alexsab.ru/lead/test/');

import GLightbox from 'glightbox';
import 'glightbox/dist/css/glightbox.min.css';
const lightbox = GLightbox({
	moreLength: 0,
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
