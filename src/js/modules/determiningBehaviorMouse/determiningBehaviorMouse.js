import { calculateDirectionChanges } from './_calculateDirectionChanges';
import { handleMouseMove } from './_calculateMouseTrajectory';
import { calculateSmoothnessScore } from './_calculateSmoothnessScore';
import { calculateSpeedAndAcceleration } from './_calculateSpeedAndAcceleration';
import { calculateTimeBetweenMouseEvents } from './_calculateTimeBetweenMouseEvents';
import { calculateMouseActivityBeforeSending } from './_calculateMouseActivityBeforeSending';

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
 * Вычисляет все метрики поведения мыши перед отправкой формы
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
  
  console.log('Метрики мыши рассчитаны:', data.mouseBehavior);
}

// Инициализируем отслеживание при загрузке модуля
initMouseTracking();
document.addEventListener('click', () => {
  calculateMouseMetrics();
});

// Экспортируем необходимые функции и данные
export { data, Criteria, calculateMouseMetrics };