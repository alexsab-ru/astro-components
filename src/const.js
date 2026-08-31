import { LAST_DAY, MONTH, YEAR } from '@/js/utils/date';
import { MENU_SLOTS, resolveMenu } from '@/js/utils/menuSlots';
import { getSitePages } from '@/js/utils/siteRoutes';
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

let menuData = {};

try {
	const imported = await import('@/data/site/menu.json');
	menuData = imported.default || imported;
} catch (e) {
	console.warn('menu.json not found, using default empty menu');
	menuData = {};
}

// Подставляем динамические children (например список моделей) во все слоты.
for (const slot of MENU_SLOTS) {
	const items = menuData?.[slot];
	if (!Array.isArray(items)) continue;
	for (const item of items) {
		if (typeof item?.children !== 'string') continue;
		const key = item.children;
		if (childrenGroup[key] && dynamicMenuConfig[key]) {
			item.children = childrenGroup[key];
		}
	}
}

/**
 * Пункты одного слота меню, готовые к рендеру.
 * Пункты, ведущие на выключенные в реестре страницы, отброшены;
 * подпись лежит в поле `name` (его читают HeaderMenuLink.astro и FooterV2.astro).
 */
export function getMenu(slot) {
	return resolveMenu(menuData, getSitePages(), slot);
}

export const STATUS = ['enable','show','disable','hide','preorder','comminsoon'];

export const REVIEWS_LIMIT = Infinity;
