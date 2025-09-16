export const noValidPhone = (phoneValue) => {
	return ([...new Set(phoneValue.replace(/^(\+7)/g, "").replace(/\D/g, ""))].length === 1);
};

export function maskphone(e) {
	let num = this.value.replace(/^(\+7|8|7)/g, "").replace(/\D/g, "").split(/(?=.)/),
		i = num.length;

	if(this.value != "" && this.value != "+") {
		if (0 <= i) num.unshift("+7");
		if (1 <= i) num.splice(1, 0, " ");
		if (4 <= i) num.splice(5, 0, " ");
		if (7 <= i) num.splice(9, 0, "-");
		if (9 <= i) num.splice(12, 0, "-");
		this.value = num.join("");
	}
}


export const phoneChecker = (phone) => {
	let errorField = phone.parentElement.querySelector(`.error-message.${phone.name}`);
	if (!phone.value.length) {
		if(errorField){
			errorField.innerText = "Телефон является обязательным полем";
			errorField.classList.remove('hidden');
		}
		return false;
	} else {
		const phoneRe = new RegExp(/^\+7 [0-9]{3} [0-9]{3}-[0-9]{2}-[0-9]{2}$/);
		if (!phoneRe.test(phone.value) || noValidPhone(phone.value)) {
			if(errorField){
				errorField.innerText = "Введен некорректный номер телефона";
				errorField.classList.remove('hidden');
			}
			return false;
		}
	}
	if(errorField){
		errorField.classList.add('hidden');
	}
	return true;
};

export const calcMinPrice = (price) => {
	var minimum = 0;
	var percent = 25;
	if(price > 1500000){
		percent = 4;
	} else if(price > 1000000){
		percent = 6;
	} else if(price > 500000){
		percent = 8;
	} else if(price > 300000){
		percent = 15;
	} else {
		minimum = 50000;
	}
	return Math.max(0,price-Math.max(price*percent/100,minimum))
};

export const getCookie = (name) => {
	var matches = document.cookie.match(new RegExp(
	"(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
	))
	return matches ? decodeURIComponent(matches[1]) : undefined
}

export const getPair = (openURL = '') => {
	let result = {referer: window.location.origin};
	if(typeof openURL === "object") {
		openURL.search.substring(1).split('&').forEach(function(el){
			var pair = el.split('=');
			result[pair[0]] = pair[1];
		});
	}
	let source = new URL(getCookie('__gtm_campaign_url') ? getCookie('__gtm_campaign_url') : window.location);
	if(source.search !== window.location.search) {
		source.search.substring(1).split('&').forEach(function(el){
			var pair = el.split('=');
			result[pair[0]] = pair[1];
		});
	}
	window.location.search.substring(1).split('&').forEach(function(el){
		var pair = el.split('=');
		result[pair[0]] = pair[1];
	});
	return result;
}

export function quoteEscaper(str) {
	return str.replace(/"/g, '\\"').replace(/\n/g, '<br/>');
}
