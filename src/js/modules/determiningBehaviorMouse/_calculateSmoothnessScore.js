// Импортируем геттер для получения массива траектории мыши
import { getMouseTrajectory } from './_calculateMouseTrajectory';

// Минимальное количество точек для расчета плавности
const MIN_POINTS_FOR_SMOOTHNESS = 2;

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
 * Вычисляет коэффициент плавности траектории мыши
 * Коэффициент = Общее пройденное расстояние / Прямое расстояние
 * 
 * Боты: ~1.0-1.2 (движутся почти по прямой)
 * Люди: 1.5-3.0+ (извилистая траектория с корректировками)
 * 
 * @returns {number} Коэффициент плавности (минимум 1.0)
 */
function calculateSmoothnessScore() {
  // Получаем актуальный массив траектории через геттер
  const mouseTrajectory = getMouseTrajectory();
  
  // Если точек недостаточно, невозможно вычислить плавность
  if (mouseTrajectory.length < MIN_POINTS_FOR_SMOOTHNESS) {
    return 0;
  }
  
  // Если только 2 точки, это идеально прямая линия
  if (mouseTrajectory.length === MIN_POINTS_FOR_SMOOTHNESS) {
    return 1.0;
  }
  
  // Переменная для накопления общего пройденного расстояния
  let totalDistance = 0;
  
  // Проходим по всем последовательным парам точек
  // Суммируем расстояния между каждой парой соседних точек
  for (let i = 0; i < mouseTrajectory.length - 1; i++) {
    const segmentDistance = calculateDistance(
      mouseTrajectory[i], 
      mouseTrajectory[i + 1]
    );
    totalDistance += segmentDistance;
  }
  
  // Вычисляем прямое расстояние от первой до последней точки
  // Это "идеальное" расстояние, если бы мышь двигалась по прямой
  const straightDistance = calculateDistance(
    mouseTrajectory[0],
    mouseTrajectory[mouseTrajectory.length - 1]
  );
  
  // Защита от деления на ноль
  // Если начальная и конечная точки совпадают
  if (straightDistance === 0) {
    // Если мышь двигалась, но вернулась в начальную точку
    // Это указывает на очень извилистую траекторию
    return totalDistance > 0 ? 999 : 1.0;
  }
  
  // Вычисляем коэффициент плавности
  // Чем больше значение, тем более извилистый путь
  const smoothnessScore = totalDistance / straightDistance;
  
  // Округляем до 2 знаков после запятой для удобства
  return Math.round(smoothnessScore * 100) / 100;
}

// Экспортируем функцию для использования в основном модуле
export { calculateSmoothnessScore };