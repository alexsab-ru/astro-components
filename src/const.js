import { phoneFormat } from '@/js/utils/numbers.format';
import { LAST_DAY, MONTH, YEAR } from '@/js/utils/date';
// Конечное время для таймера
//string 2025-12-31T23:59:59+04:00
export const TIMER = { title: 'До конца акции осталось',subtitle: '', endtime: `${YEAR}-${MONTH}-${LAST_DAY}T23:59:59+04:00`, btnName: 'Зафиксировать цену', show: false };
// Объект для бегущей строки
export const MARQUEE = { title: `Тотальная распродажа до ${LAST_DAY}.${MONTH}.${YEAR}`, count: 8, speed: 20, show: false };
// Ссылка яндекс-виджета
export const LINK_WIDGET = 'https://yandex.ru/map-widget/v1/-/';

import settings from '@/data/settings.json';
const { phone_common } = settings;


// Ссылки под хедером
import { groupArrayByKey } from '@/js/utils/groupArrayByKey';
import { isModelVisible } from '@/js/utils/modelVisibility';
import modelsData from '@/data/models.json';
const { models } = modelsData;
const groupModelsByBrand = groupArrayByKey(models.filter(isModelVisible), 'mark_id');

// Конфигурация для динамических меню
const dynamicMenuConfig = {
	models: {
		baseUrl: '/models/',
		dataSource: groupModelsByBrand,
		transform: (model) => ({
			url: `/models/${model.id}/`,
			name: model.name.toUpperCase(),
			thumb: model.thumb,
			status: model?.status || null,
			badge: model?.badge || null,
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
	menu = await import('@/data/menu.json');	
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

// Коллекции теперь хранятся в @/data/collections.json

// Текст согласия в формах
export const AGREE_LABEL = '<span>Даю согласие на обработку своих персональных данных на условиях, указанных</span> <a href="/privacy-policy/" class="m-0! underline transition-all hover:no-underline" target="_blank">здесь</a> и на использование cookie на условиях, указанных <a href="/cookie-policy/" class="m-0! underline transition-all hover:no-underline" target="_blank">здесь</a>';

// Текст информации в футере
import salonsData from '@/data/salons.json';
const salons = salonsData.filter(salon => !salon?.type || salon?.type.includes('footer_info'));
const phones = phone_common ? [`<a class="whitespace-nowrap" href="tel:${phoneFormat(phone_common)}">${phone_common}</a>`] : salons.map((salon) => { return `<span>${salon.name}</span> <a class="whitespace-nowrap" href="tel:${phoneFormat(salon.phone)}">${salon.phone}</a>` });

export const FOOTER_INFO = '<sup>*</sup> Вся представленная на сайте информация, касающаяся автомобилей и сервисного обслуживания, носит информационный характер и не является публичной офертой, определяемой положениями ст. 437 ГК РФ. Все цены, указанные на данном сайте, носят информационный характер. Для получения подробной информации просьба обращаться к менеджерам отдела продаж по номеру телефона '+phones.join(', ')+'. Опубликованная на данном сайте информация может быть изменена в любое время без предварительного уведомления.';
export const REVIEWS_LIMIT = Infinity;
