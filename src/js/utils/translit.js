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

export const rusKey = (key) => {
   const engToRus = {
      brand: { label: "Марка", orderId: 1 },
      model: { label: "Модель", orderId: 2 },
      year: { label: "Год выпуска", orderId: 3 },
      bodyNumber: { label: "VIN", orderId: 4 },
      modification: { label: "Модификация", orderId: 5 },
      generation: { label: "Поколение", orderId: 6 },
      bodyConfiguration: { label: "Тип кузова", orderId: 7 },
      engineType: { label: "Двигатель", orderId: 8 },
      engineVolume: { label: "Объем двигателя (м3)", orderId: 9 },
      enginePower: { label: "Мощность (л.с.)", orderId: 10 },
      driveType: { label: "Привод", orderId: 11 },
      gearboxType: { label: "КПП", orderId: 12 },
   };

   if (!engToRus[key]) return null;

   return { ...engToRus[key] };
};

export const vinTranslit = (value) => {
   const translitMap = {
      а: 'a',
      т: 't',
      х: 'x',
   };
   return value.replace(/[а-я]/gi, (matched) => translitMap[matched.toLowerCase()] || matched);
};