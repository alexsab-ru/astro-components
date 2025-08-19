/**
 * Утилита для создания значков дисклеймеров
 * Содержит функции для работы с дисклеймерами в компонентах
 */

// Иконка для дисклеймера (информации) - SVG иконка вопроса в круге
const infoIcon = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>';

/**
 * Функция для создания значка с дисклеймером
 * Создает HTML элемент с иконкой информации и tooltip
 * @param {string} disclaimerText - текст дисклеймера
 * @returns {string} HTML строка с иконкой или пустая строка
 */
export const createDisclaimerIcon = (disclaimerText) => {
  // Если текст дисклеймера пустой или не существует, возвращаем пустую строку
  if (!disclaimerText || disclaimerText.trim() === '') return '';
  
  // Создаем HTML элемент с иконкой и атрибутом data-text для tooltip
  return `<span class="tooltip-icon" data-text="${disclaimerText}">${infoIcon}</span>`;
};

/**
 * Функция для получения иконки дисклеймера (экспорт для использования в других файлах)
 * @returns {string} SVG иконка
 */
export const getDisclaimerIcon = () => infoIcon;
