export function useTranslit(word) {
	if (!word) return false;

	const translations = {
		// engineType
      hybrid: "Гибрид",
      petrol: "Бензин",
      diesel: "Дизель",
      petrol_and_gas: "Бензин и газ",
      electric: "Электро",
      // driveType
      full_4wd: "Постоянный полный",
      optional_4wd: "Подключаемый полный",
      front: "Передний",
      rear: "Задний",
      // gearboxType
      robotized: "Робот",
      variator: "Вариатор",
      manual: "Механика",
      automatic: "Автомат",
      // transmission
      RT: "Робот",
      DCT: "Робот",
      CVT: "Вариатор",
      MT: "Механика",
      AT: "Автомат",
      //ptsType
      duplicate: "Дубликат",
      original: "Оригинал",
      electronic: "Электронный",
      //colors
      black: "Черный",
      white: "Белый",
      blue: "Синий",
      gray: "Серый",
      silver: "Серебристый",
      brown: "Коричневый",
      red: "Красный",
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