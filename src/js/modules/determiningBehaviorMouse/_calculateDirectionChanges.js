// Импортируем геттер для получения массива траектории мыши
import { getMouseTrajectory } from './_calculateMouseTrajectory';

const MIN_MOUSE_TRAJECTORY_POINTS = 3;
// Минимальный угол изменения направления, который мы считаем значимым (в градусах)
const SIGNIFICANT_ANGLE_CHANGE = 15;

/**
 * Вычисляет угол направления между двумя точками в градусах
 * @param {Object} point1 - Первая точка с координатами {x, y}
 * @param {Object} point2 - Вторая точка с координатами {x, y}
 * @returns {number} Угол в градусах от 0 до 360
 */
function calculateAngle(point1, point2) {
  // Вычисляем разницу координат
  const deltaX = point2.x - point1.x;
  const deltaY = point2.y - point1.y;
  
  // Используем atan2 для получения угла в радианах
  // atan2 возвращает значение от -PI до PI
  const angleRadians = Math.atan2(deltaY, deltaX);
  
  // Конвертируем радианы в градусы
  // Добавляем 360 и берем остаток для нормализации в диапазон 0-360
  const angleDegrees = (angleRadians * 180 / Math.PI + 360) % 360;
  
  return angleDegrees;
}

/**
 * Подсчитывает количество значительных изменений направления движения мыши
 * Изменение считается значительным, если угол изменился более чем на 15 градусов
 * @returns {number} Количество изменений направления
 */
function calculateDirectionChanges() {
  // Получаем актуальный массив траектории через геттер
  const mouseTrajectory = getMouseTrajectory();
  
  // Если точек меньше 3, невозможно определить изменение направления
  if (mouseTrajectory.length < MIN_MOUSE_TRAJECTORY_POINTS) {
    return 0;
  }
  
  // Счетчик изменений направления
  let directionChanges = 0;
  
  // Предыдущий угол направления (инициализируем первым сегментом)
  let previousAngle = calculateAngle(mouseTrajectory[0], mouseTrajectory[1]);
  
  // Проходим по всем последующим сегментам траектории
  for (let i = 1; i < mouseTrajectory.length - 1; i++) {
    // Вычисляем угол текущего сегмента
    const currentAngle = calculateAngle(mouseTrajectory[i], mouseTrajectory[i + 1]);
    
    // Вычисляем разницу углов
    let angleDifference = Math.abs(currentAngle - previousAngle);
    
    // Нормализуем разницу углов (учитываем переход через 0/360 градусов)
    // Например, разница между 10° и 350° должна быть 20°, а не 340°
    if (angleDifference > 180) {
      angleDifference = 360 - angleDifference;
    }
    
    // Если изменение угла достаточно большое - считаем это изменением направления
    if (angleDifference > SIGNIFICANT_ANGLE_CHANGE) {
      directionChanges++;
    }
    
    // Сохраняем текущий угол для следующей итерации
    previousAngle = currentAngle;
  }
  
  return directionChanges;
}

export { calculateDirectionChanges };