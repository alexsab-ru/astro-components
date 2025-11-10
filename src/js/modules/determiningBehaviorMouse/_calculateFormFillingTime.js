// WeakMap для хранения данных о времени заполнения каждой формы
// WeakMap автоматически очищает память когда форма удаляется из DOM
const formTimers = new WeakMap();

/**
 * Запускает таймер для формы при первом взаимодействии
 * Если таймер уже запущен - увеличивает счетчик взаимодействий
 * @param {HTMLFormElement} formElement - элемент формы
 */
function startFormTimer(formElement) {
  // Проверяем, запущен ли уже таймер для этой формы
  if (!formTimers.has(formElement)) {
    // Создаем новую запись с временем начала
    formTimers.set(formElement, {
      startTime: Date.now(), // время первого взаимодействия
      interactionCount: 1    // счетчик взаимодействий с формой
    });
    
    console.log('⏱️ Таймер формы запущен');
  } else {
    // Если таймер уже есть - просто увеличиваем счетчик взаимодействий
    const timer = formTimers.get(formElement);
    timer.interactionCount++;
  }
}

/**
 * Вычисляет время заполнения формы от первого взаимодействия до отправки
 * @param {HTMLFormElement} formElement - элемент формы
 * @returns {number} Время в миллисекундах или 0 если таймер не был запущен
 */
function getFormFillingTime(formElement) {
  const timer = formTimers.get(formElement);
  
  // Если таймер был запущен - вычисляем разницу времени
  if (timer) {
    const fillingTime = Date.now() - timer.startTime;
    console.log(`⏱️ Время заполнения формы: ${fillingTime}ms (${(fillingTime / 1000).toFixed(1)}s)`);
    return fillingTime;
  }
  
  // Если таймер не был запущен (форма отправлена без взаимодействий)
  // Это подозрительно - возможно бот
  console.warn('⚠️ Форма отправлена без взаимодействий!');
  return 0;
}

/**
 * Получает количество взаимодействий с формой
 * Полезно для дополнительного анализа поведения
 * @param {HTMLFormElement} formElement - элемент формы
 * @returns {number} Количество взаимодействий
 */
function getInteractionCount(formElement) {
  const timer = formTimers.get(formElement);
  return timer ? timer.interactionCount : 0;
}

/**
 * Инициализирует отслеживание времени заполнения для всех форм на странице
 * Отслеживает события focusin и input для определения начала работы с формой
 */
function initFormTimers() {
  // Событие focusin срабатывает когда пользователь кликает в любое поле
  // Используем capture phase (true) чтобы поймать событие раньше других обработчиков
  document.addEventListener('focusin', (event) => {
    // Ищем родительскую форму для элемента, который получил фокус
    const form = event.target.closest('form');
    
    // Если элемент находится внутри формы - запускаем таймер
    if (form) {
      startFormTimer(form);
    }
  }, true);
  
  // Событие input срабатывает когда пользователь вводит текст или меняет значение
  // Это дублирует focusin для надежности (например, автозаполнение браузером)
  document.addEventListener('input', (event) => {
    const form = event.target.closest('form');
    
    if (form) {
      startFormTimer(form);
    }
  }, true);
  
  // Также отслеживаем изменения в select, checkbox, radio
  document.addEventListener('change', (event) => {
    const form = event.target.closest('form');
    
    if (form) {
      startFormTimer(form);
    }
  }, true);
  
  console.log('✅ Отслеживание времени заполнения форм активировано');
}

// Экспортируем функции для использования в основном модуле
export { initFormTimers, getFormFillingTime, getInteractionCount, formTimers };

