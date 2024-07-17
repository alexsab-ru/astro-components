export function useTranslit(word) {
	if (!word) return false;

	const translations = {
		bodytype: "Кузов",
		body_type: "Кузов",
		engine: "Объем двигателя",
		engine_volume: "Объем двигателя",
		gear_rus: "Трансмиссия",
		gear_box: "Коробка передач",
		engine_power: "Мощность",
		drive: "Привод",
		fuel: "Тип топлива",
		engine_type: "Тип топлива",
		year: "Год выпуска",
		color_rus: "Цвет кузова",
		color_simple: "Цвет кузова",
	};
	
	return translations[word] || word;
 }