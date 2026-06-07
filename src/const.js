import { LAST_DAY, MONTH, YEAR } from '@/js/utils/date';
// Конечное время для таймера
//string 2025-12-31T23:59:59+04:00
export const TIMER = { title: 'До конца акции осталось',subtitle: '', endtime: `${YEAR}-${MONTH}-${LAST_DAY}T23:59:59+04:00`, btnName: 'Зафиксировать цену', show: false };
// Объект для бегущей строки
export const MARQUEE = { title: `Тотальная распродажа до ${LAST_DAY}.${MONTH}.${YEAR}`, count: 8, speed: 20, show: false };
// Ссылка яндекс-виджета
export const LINK_WIDGET = 'https://yandex.ru/map-widget/v1/-/';

// Ссылки под хедером
import { groupArrayByKey } from '@/js/utils/groupArrayByKey';
import { isModelVisible } from '@/js/utils/modelVisibility';
import { setPrefixModelUrl } from '@/js/utils/helpers';
import { getModelBrandDisplayName, getModelBrandId, getModelThumb, getModelTitle } from '@/js/utils/modelFields';
import modelsData from '@/data/site/models.json';
const { models } = modelsData;
const groupModelsByBrand = groupArrayByKey(
	models.filter(isModelVisible).map((model) => ({
		...model,
		brandGroup: getModelBrandDisplayName(model),
	})),
	'brandGroup',
);

export const IS_MODEL_PREFIX_URL = Object.keys(groupModelsByBrand).length > 1;

// Конфигурация для динамических меню
const dynamicMenuConfig = {
	models: {
		baseUrl: '/models/',
		dataSource: groupModelsByBrand,
		transform: (model) => ({
			url: `/models/${setPrefixModelUrl(model, IS_MODEL_PREFIX_URL)}/`,
			name: getModelTitle(model).toUpperCase(),
			thumb: getModelThumb(model),
			status: model?.status || null,
			badge: model?.badge || null,
			brandId: getModelBrandId(model),
		})
	}
	// В будущем можно добавить другие типы:
	// services: { baseUrl: '/services/', dataSource: servicesData, transform: ... }
	// news: { baseUrl: '/news/', dataSource: newsData, transform: ... }
};

// Формируем childrenGroup на основе конфигурации
const childrenGroup = Object.keys(dynamicMenuConfig).reduce((acc, type) => {
	const config = dynamicMenuConfig[type];
	acc[type] = Object.keys(config.dataSource).reduce((brandAcc, brandKey) => {
		brandAcc[brandKey] = config.dataSource[brandKey].map(config.transform);
		return brandAcc;
	}, {});
	return acc;
}, {});

let menu = [];

try {
	menu = await import('@/data/site/menu.json');
	menu = menu.default || menu; // Обработка случая, когда импорт возвращает объект с ключом default
} catch (e) {
	console.warn('menu.json not found, using default empty menu');
	menu = []; // или какой-то fallback
}

// Обрабатываем динамические children только для известных типов
menu.length > 0 && menu.map(item => {
	if(typeof item?.children === 'string'){
		const key = item.children;		
		// Проверяем, что это именно известный тип из конфигурации
		if (childrenGroup[key] && dynamicMenuConfig[key]) {			
			item.children = childrenGroup[key];
		}
	}
});

export const LINKS_MENU = menu;

export const STATUS = ['enable','show','disable','hide','preorder','comminsoon'];

export const REVIEWS_LIMIT = Infinity;
