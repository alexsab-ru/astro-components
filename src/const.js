export const SITE_NAME = 'Название сайта'; // Название сайта по умолчанию
export const LEGAL_ENTITY = 'ООО «Юридическое название»'; // Юр лицо
export const LEGAL_INN = '1234567890'; // ИНН
export const LEGAL_CITY = 'г. Город'; // Город
export const SITE_DESCR = 'Официальный дилерский центр'; // Описание сайта по умолчанию

export const BRAND = 'Baic';

export const LINKS_MENU = [
	{url: 'cars/', name: 'Авто в наличии'},
	{url: 'special-offers/', name: 'Спецпредложения'},
	{url: 'news/', name: 'Новости'},
	{url: '#services', name: 'Услуги'},
	{url: '#contacts', name: 'Контакты'},
];

export const HEADER_TOP_LINE = 'ООО "Киа Центр Самара" расширяет горизонты: теперь и дилер JAC Motors (Джак Моторс)';

import {getPages} from '@/js/pages';
export const PAGES = await getPages();

export const AGREE_LABEL = '<span>Я согласен на</span><a href="/privacy-policy" class="underline transition-all hover:no-underline" target="_blank">обработку персональных данных</a>';
export const FOOTER_INFO = '<sup>*</sup> Вся представленная на сайте информация, касающаяся автомобилей и сервисного обслуживания, носит информационный характер и не является публичной офертой, определяемой положениями ст. 437 ГК РФ. Все цены, указанные на данном сайте, носят информационный характер. Для получения подробной информации просьба обращаться к менеджерам отдела продаж по номеру телефона <a href="tel:+79991234567">+7&nbsp;(999) 123-45-67</a>. Опубликованная на данном сайте информация может быть изменена в любое время без предварительного уведомления.';
