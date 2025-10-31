// Импортируем геттер для получения массива траектории мыши
import { getMouseTrajectory } from './_calculateMouseTrajectory';

// Минимальное количество точек для расчета временных интервалов
const MIN_POINTS_FOR_TIME_ANALYSIS = 2;

/**
 * Вычисляет стандартное отклонение временных интервалов между событиями мыши
 * 
 * Боты часто генерируют события с очень равномерными интервалами (например, ровно 16ms)
 * Люди создают события с переменными интервалами из-за естественных движений
 * 
 * Боты: низкое стандартное отклонение (~0-5ms) - слишком равномерные интервалы
 * Люди: высокое стандартное отклонение (>10ms) - переменные интервалы
 * 
 * @returns {number} Стандартное отклонение временных интервалов в миллисекундах
 */
function calculateTimeBetweenMouseEvents() {
  // Получаем актуальный массив траектории через геттер
  const mouseTrajectory = getMouseTrajectory();
  
  // Если точек недостаточно, невозможно вычислить интервалы
  if (mouseTrajectory.length < MIN_POINTS_FOR_TIME_ANALYSIS) {
    return 0;
  }
  
  // Массив для хранения временных интервалов между событиями
  const timeIntervals = [];
  
  // Проходим по всем последовательным парам точек
  for (let i = 0; i < mouseTrajectory.length - 1; i++) {
    const point1 = mouseTrajectory[i];
    const point2 = mouseTrajectory[i + 1];
    
    // Вычисляем интервал времени между событиями (в миллисекундах)
    const timeInterval = point2.timestamp - point1.timestamp;
    
    // Добавляем интервал в массив
    // Даже если интервал = 0, добавляем его (это тоже информация)
    timeIntervals.push(timeInterval);
  }
  
  // Если нет интервалов для анализа
  if (timeIntervals.length === 0) {
    return 0;
  }
  
  // Если только один интервал, стандартное отклонение = 0
  if (timeIntervals.length === 1) {
    return 0;
  }
  
  // Вычисляем средний интервал времени
  const averageInterval = timeIntervals.reduce((sum, interval) => sum + interval, 0) / timeIntervals.length;
  
  // Вычисляем дисперсию (variance)
  // Дисперсия = среднее квадратов отклонений от среднего
  const variance = timeIntervals.reduce((sum, interval) => {
    const deviation = interval - averageInterval;
    return sum + (deviation * deviation);
  }, 0) / timeIntervals.length;
  
  // Стандартное отклонение = квадратный корень из дисперсии
  const standardDeviation = Math.sqrt(variance);
  
  // Округляем до 2 знаков после запятой
  return Math.round(standardDeviation * 100) / 100;
}

/**
 * Дополнительная функция для получения среднего интервала (для отладки)
 * Не используется в основной логике, но может быть полезна
 * @returns {number} Средний интервал между событиями в миллисекундах
 */
function getAverageTimeBetweenEvents() {
  const mouseTrajectory = getMouseTrajectory();
  
  if (mouseTrajectory.length < MIN_POINTS_FOR_TIME_ANALYSIS) {
    return 0;
  }
  
  let totalTime = 0;
  let count = 0;
  
  for (let i = 0; i < mouseTrajectory.length - 1; i++) {
    totalTime += mouseTrajectory[i + 1].timestamp - mouseTrajectory[i].timestamp;
    count++;
  }
  
  return count > 0 ? Math.round((totalTime / count) * 100) / 100 : 0;
}

// Экспортируем функцию для использования в основном модуле
export { calculateTimeBetweenMouseEvents };

