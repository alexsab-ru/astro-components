import { calculateDirectionChanges } from './_calculateDirectionChanges';
import { handleMouseMove } from './_calculateMouseTrajectory';
import { calculateSmoothnessScore } from './_calculateSmoothnessScore';
import { calculateSpeedAndAcceleration } from './_calculateSpeedAndAcceleration';
import { calculateTimeBetweenMouseEvents } from './_calculateTimeBetweenMouseEvents';
import { calculateMouseActivityBeforeSending } from './_calculateMouseActivityBeforeSending';
import { initFormTimers, getFormFillingTime, getInteractionCount } from './_calculateFormFillingTime';
import { getDeviceInfo } from './_determiningDevice';
import { calculateResult, ANALYSIS_RESULT } from './_calculateResult';

// Критерии для определения подозрительного поведения (возможный бот)
const Criteria = {
  DIRECTION_CHANGES: 15,
  SMOOTHNESS_SCORE: 1.2,
  SPEED_AND_ACCELERATION: 50,
  TIME_BETWEEN_MOUSE_EVENT: 16,
  MOUSE_ACTIVITY_BEFORE_SENDING: 10
};

// Объект для хранения всех собранных данных о поведении пользователя
const data = {
  mouseBehavior: {
    // Подсчет углов изменения направления
    // Боты: мало изменений (< 10-15 за сессию)
    // Люди: много изменений (> 30-50)
    directionChanges: null,
    // Коэффициент плавности траектории
    // Боты: ~1.0-1.2 (почти прямая линия)
    // Люди: 1.5-3.0+ (извилистая траектория)
    smoothnessScore: null,
    // Стандартное отклонение скорости
    // Боты: низкое (<50)
    // Люди: высокое (>100)
    speedAndAcceleration: null,
    // Средний интервал между событиями
    // Боты: слишком равномерные интервалы (~16ms точно)
    // Люди: переменные интервалы (10-50ms с вариацией)
    timeBetweenMouseEvents: null,
    // Количество событий mousemove
    // Боты: 0-10 событий
    // Люди: >50-100 событий
    mouseActivityBeforeSending: null
  },
  formFillingTime: null,
  device: null,
  result: null,
};

/**
 * Инициализирует отслеживание движения мыши
 * Добавляет слушатель события mousemove на весь документ
 */
function initMouseTracking() {
  // Добавляем обработчик на весь документ
  document.addEventListener('mousemove', handleMouseMove);
  
  console.log('Отслеживание движения мыши активировано');
}

/**
 * Вычисляет все метрики поведения мыши
 * Записывает результаты в объект data
 */
function calculateMouseMetrics() {
  // Вычисляем количество изменений направления
  data.mouseBehavior.directionChanges = calculateDirectionChanges();
  // Вычисляем коэффициент плавности траектории
  data.mouseBehavior.smoothnessScore = calculateSmoothnessScore();
  // Вычисляем стандартное отклонение скорости
  data.mouseBehavior.speedAndAcceleration = calculateSpeedAndAcceleration();
  // Вычисляем стандартное отклонение временных интервалов
  data.mouseBehavior.timeBetweenMouseEvents = calculateTimeBetweenMouseEvents();
  // Подсчитываем общее количество событий мыши
  data.mouseBehavior.mouseActivityBeforeSending = calculateMouseActivityBeforeSending();
}

/**
 * Обработчик отправки формы
 * Собирает все метрики перед отправкой
 * @param {Event} event - событие submit
 */
function handleFormSubmit(event) {
  const form = event.target;
  
  // Вычисляем все метрики мыши
  calculateMouseMetrics();
  
  // Получаем время заполнения конкретной формы
  data.formFillingTime = getFormFillingTime(form);
  
  // Получаем количество взаимодействий с формой (для дополнительного анализа)
  const interactionCount = getInteractionCount(form);
  
  // Вычисляем итоговый результат: человек или бот
  data.result = calculateResult(data, Criteria);
  
  // Выводим полные данные в консоль
  console.log('📊 Полные данные о поведении пользователя:', {
    ...data,
    interactionCount: interactionCount
  });
  
  // Выводим итоговый вердикт
  if (data.result === ANALYSIS_RESULT.HUMAN) {
    console.log('✅ РЕЗУЛЬТАТ: Это человек');
  } else if (data.result === ANALYSIS_RESULT.BOT) {
    console.warn('🤖 РЕЗУЛЬТАТ: Это бот!');
  } else if (data.result === ANALYSIS_RESULT.SUSPICIOUS) {
    console.warn('⚠️ РЕЗУЛЬТАТ: Подозрительное поведение');
  }

  event.preventDefault();
  
  // TODO: Добавить скрытые поля с метриками в форму
}

/**
 * Инициализирует все системы отслеживания поведения
 * Запускается автоматически при загрузке модуля
 */
function init() {
  // Собираем информацию об устройстве сразу при загрузке
  // Эти данные не изменятся во время сессии
  data.device = getDeviceInfo();
  console.log('🖥️ Информация об устройстве собрана:', data.device);
  
  // Инициализируем отслеживание движения мыши
  initMouseTracking();
  
  // Инициализируем отслеживание времени заполнения форм
  initFormTimers();
  
  // Добавляем обработчик на все формы страницы
  // Используем capture phase (true) чтобы поймать событие раньше других обработчиков
  document.addEventListener('submit', handleFormSubmit, true);
  
  console.log('✅ Система защиты от ботов инициализирована');
}

// Запускаем инициализацию при загрузке модуля
init();

// Экспортируем необходимые функции и данные
export { data, Criteria, calculateMouseMetrics, handleFormSubmit };