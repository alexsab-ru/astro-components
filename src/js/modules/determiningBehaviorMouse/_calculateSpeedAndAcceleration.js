// Импортируем геттер для получения массива траектории мыши
import { getMouseTrajectory } from './_calculateMouseTrajectory';

// Минимальное количество точек для расчета скорости
const MIN_POINTS_FOR_SPEED = 2;

/**
 * Вычисляет расстояние между двумя точками по теореме Пифагора
 * @param {Object} point1 - Первая точка с координатами {x, y}
 * @param {Object} point2 - Вторая точка с координатами {x, y}
 * @returns {number} Расстояние в пикселях
 */
function calculateDistance(point1, point2) {
  // Разница координат по оси X и Y
  const deltaX = point2.x - point1.x;
  const deltaY = point2.y - point1.y;
  
  // Применяем теорему Пифагора: √(x² + y²)
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  
  return distance;
}

/**
 * Вычисляет стандартное отклонение скорости движения мыши
 * Стандартное отклонение показывает, насколько сильно варьируется скорость
 * 
 * Боты: низкое стандартное отклонение (<50) - движутся с постоянной скоростью
 * Люди: высокое стандартное отклонение (>100) - скорость постоянно меняется
 * 
 * @returns {number} Стандартное отклонение скорости в пикселях/миллисекунду
 */
function calculateSpeedAndAcceleration() {
  // Получаем актуальный массив траектории через геттер
  const mouseTrajectory = getMouseTrajectory();
  
  // Если точек недостаточно, невозможно вычислить скорость
  if (mouseTrajectory.length < MIN_POINTS_FOR_SPEED) {
    return 0;
  }
  
  // Массив для хранения значений скорости между каждой парой точек
  const speeds = [];
  
  // Проходим по всем последовательным парам точек
  for (let i = 0; i < mouseTrajectory.length - 1; i++) {
    const point1 = mouseTrajectory[i];
    const point2 = mouseTrajectory[i + 1];
    
    // Вычисляем расстояние между точками
    const distance = calculateDistance(point1, point2);
    
    // Вычисляем время между событиями (в миллисекундах)
    const timeDelta = point2.timestamp - point1.timestamp;
    
    // Защита от деления на ноль
    // Если события произошли одновременно, пропускаем
    if (timeDelta === 0) {
      continue;
    }
    
    // Вычисляем скорость: расстояние / время
    // Получаем пиксели в миллисекунду
    const speed = distance / timeDelta;
    
    // Добавляем в массив скоростей
    speeds.push(speed);
  }
  
  // Если нет валидных измерений скорости
  if (speeds.length === 0) {
    return 0;
  }
  
  // Если только одно измерение, стандартное отклонение = 0
  if (speeds.length === 1) {
    return 0;
  }
  
  // Вычисляем среднюю скорость
  const averageSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
  
  // Вычисляем дисперсию (variance)
  // Дисперсия = среднее квадратов отклонений от средней
  const variance = speeds.reduce((sum, speed) => {
    const deviation = speed - averageSpeed;
    return sum + (deviation * deviation);
  }, 0) / speeds.length;
  
  // Стандартное отклонение = квадратный корень из дисперсии
  const standardDeviation = Math.sqrt(variance);
  
  // Масштабируем для более удобных чисел (умножаем на 1000)
  // Так как скорость в пикселях/мс очень маленькое число
  const scaledStandardDeviation = standardDeviation * 1000;
  
  // Округляем до 2 знаков после запятой
  return Math.round(scaledStandardDeviation * 100) / 100;
}

// Экспортируем функцию для использования в основном модуле
export { calculateSpeedAndAcceleration };

