const MAX_MOUSE_TRAJECTORY_LENGHT = 1000;
// Массив для хранения всех точек траектории мыши
// Каждая точка содержит координаты x, y и время события
const mouseTrajectory = [];

/**
 * Геттер для получения массива траектории мыши
 * Возвращает ссылку на оригинальный массив, а не копию
 * Это гарантирует, что все модули работают с одними и теми же данными
 * @returns {Array} Массив точек траектории мыши
 */
function getMouseTrajectory() {
  return mouseTrajectory;
}

/**
 * Обработчик события движения мыши
 * Сохраняет координаты и время каждого события для дальнейшего анализа
 */
function handleMouseMove(event) {
  // Записываем координаты мыши и время события
  mouseTrajectory.push({
    x: event.clientX,
    y: event.clientY,
    timestamp: Date.now()
  });
  
  // Опционально: ограничиваем размер массива, чтобы не перегружать память
  // Храним только последние 1000 точек (этого более чем достаточно)
  if (mouseTrajectory.length > MAX_MOUSE_TRAJECTORY_LENGHT) {
    mouseTrajectory.shift(); // удаляем самую старую точку
  }
}

export { getMouseTrajectory, handleMouseMove };