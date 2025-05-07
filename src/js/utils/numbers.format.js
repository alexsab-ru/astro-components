function phoneFormat(phone) {
	var cleanNumber = phone.replace(/\D/g, '');

	// Удаляем первую цифру, если это 7 или 8
	if(cleanNumber.length > 10) {
		if (cleanNumber.startsWith('7') || cleanNumber.startsWith('8')) {
			cleanNumber = cleanNumber.substring(1);
		}
	}

	return "+7"+cleanNumber;
}

function declOfNums(value, words = ['автомобиль', 'автомобиля', 'автомобилей']) {
	value = Math.abs(value) % 100;
	var num = value % 10;
	if (value > 10 && value < 20) return words[2];
	if (num > 1 && num < 5) return words[1];
	if (num == 1) return words[0];
	return words[2];
}

function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min) + min);
}

function currencyFormat(number, locale = 'ru-RU') {
	// Проверка на null, undefined, или пустую строку
	if (number === null || number === undefined || number === '' || isNaN(number)) {
		return;
	}

	// Если number является строкой, пытаемся преобразовать её в число
	if (typeof number === 'string') {
		number = parseFloat(number);
	}

	// Если после преобразования значение не является числом (например, если оно было невалидной строкой)
	if (isNaN(number)) {
		return;
	}

	return number.toLocaleString(locale, { 
		style: "currency", 
		currency: "RUB", 
		minimumFractionDigits: 0,
	});
}

// Универсальный экспорт для поддержки как ES6, так и CommonJS
const utils = {
    phoneFormat,
    declOfNums,
    getRandomInt,
    currencyFormat
};

// Поддержка ES6 модулей
export { phoneFormat, declOfNums, getRandomInt, currencyFormat };

// Поддержка CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = utils;
}

