import { phoneFormat } from '@/js/utils/numbers.format';
import { LAST_DAY, MONTH, YEAR } from '@/js/utils/date';
// Название сайта по умолчанию
export const SITE_NAME = 'Партнер';
// Юр лицо
export const LEGAL_ENTITY = 'ООО «ПАРТНЕР»';
// ИНН
export const LEGAL_INN = '5609202210';
// Город
export const LEGAL_CITY = 'г. Оренбург';
// где? в Городе
export const LEGAL_CITY_WHERE = 'Оренбурге';
// Описание сайта по умолчанию
export const SITE_DESCR = 'Официальный дилерский центр';
// Телефон по умолчанию
export const PHONE = '+7 (353) 240-53-53';
// Бренд
export const BRAND = 'KNEWSTAR';
// Конечное время для таймера
//string 2024-04-26 or 2024-04-26 23:59:59 or December 31 2015 or December 31 2015 23:59:59 GMT+02:00
export const TIMER_ENDTIME = '';
// Объект для бегущей строки
export const MARQUEE = {title: 'Тотальная распродажа до', dateTo: `${LAST_DAY}.${MONTH}.${YEAR}`, count: [1,2,3,4,5,6,7,8], show: false };
// Ссылка яндекс-виджета
export const LINK_WIDGET = 'https://yandex.ru/map-widget/v1/-/';
// Ссылка организации для виджета
export const LINK_WIDGET_ORGNIZATION = '';
// Ссылки под хедером
import modelsData from '@/data/models.json';
const models = modelsData.filter(model => model.show);
export const LINKS_MENU = [
	{url: 'cars/', name: 'Авто в наличии'},
	// {url: 'catalog/', name: 'Каталог'},
	// {url: 'used_cars/', name: 'Авто с пробегом'},
	{ 
		url: 'models/', 
		name: 'Модели',
		children: models.map(model => ( { url: `models/${model.id}/`, name: `${model?.mark_id} ${model.name.toUpperCase()}` } ) )
	},
	// {url: 'trade-in/', name: 'Оценка автомобиля'},
	{url: 'special-offers/', name: 'Спецпредложения'},
	{url: 'news/', name: 'Новости'},
	{url: 'test-drive/', name: 'Запись на тест-драйв'},
	{url: 'service-request/', name: 'Запись на сервис'},
	{url: '#services', name: 'Услуги'},
	{url: 'contacts/', name: 'Контакты'},
];
// Коллекции
export const COLLECTIONS = [
	{name: 'special-offers', title: 'Спецпредложения'},
	{name: 'news', title: 'Новости'},
];
// Текстовая строка над хедером
export const HEADER_TOP_LINE = '';
// Текст согласия в формах
export const AGREE_LABEL = '<span>Я согласен на</span><a href="/privacy-policy" class="underline transition-all hover:no-underline" target="_blank">обработку персональных данных</a>';
// Текст информации в футере
import salonsData from '@/data/salons.json';
const salons = salonsData.filter(salon => !salon.type || salon.type.includes('footer_info'));
const phones = PHONE ? [`<a class="whitespace-nowrap" href="tel:${phoneFormat(PHONE)}">${PHONE}</a>`] : salons.map((salon) => { return `<span>${salon.name}</span> <a class="whitespace-nowrap" href="tel:${phoneFormat(salon.phone)}">${salon.phone}</a>` });

export const FOOTER_INFO = '<sup>*</sup> Вся представленная на сайте информация, касающаяся автомобилей и сервисного обслуживания, носит информационный характер и не является публичной офертой, определяемой положениями ст. 437 ГК РФ. Все цены, указанные на данном сайте, носят информационный характер. Для получения подробной информации просьба обращаться к менеджерам отдела продаж по номеру телефона '+phones.join(', ')+'. Опубликованная на данном сайте информация может быть изменена в любое время без предварительного уведомления.';
