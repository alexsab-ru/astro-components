import translations from '@/data/all-translations.json';

export function useTranslit(word) {
	if (!word) return false;

	const normalizedWord = typeof word === 'string' ? word.trim() : word;
	if (typeof normalizedWord !== 'string' || normalizedWord.length === 0) return word;

	return translations[normalizedWord] || translations[normalizedWord.toLowerCase()] || word;
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
