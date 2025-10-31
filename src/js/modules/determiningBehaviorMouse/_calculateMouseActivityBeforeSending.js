// Импортируем геттер для получения массива траектории мыши
import { getMouseTrajectory } from './_calculateMouseTrajectory';

/**
 * Подсчитывает количество событий движения мыши перед отправкой формы
 * 
 * Это одна из самых простых, но эффективных метрик для определения ботов.
 * Боты часто заполняют форму без движения мыши или с минимальным количеством событий.
 * Люди обычно активно двигают мышью при заполнении формы.
 * 
 * Боты: 0-10 событий (почти нет движения мыши)
 * Люди: 50-100+ событий (активное движение мыши по странице)
 * 
 * @returns {number} Количество зафиксированных событий движения мыши
 */
function calculateMouseActivityBeforeSending() {
  // Получаем актуальный массив траектории через геттер
  const mouseTrajectory = getMouseTrajectory();
  
  // Возвращаем общее количество точек в траектории
  // Каждая точка = одно событие mousemove
  return mouseTrajectory.length;
}

/**
 * Дополнительная функция для получения детальной информации о активности
 * Может быть полезна для отладки и анализа
 * @returns {Object} Объект с детальной информацией о активности мыши
 */
function getDetailedMouseActivity() {
  const mouseTrajectory = getMouseTrajectory();
  
  // Если нет данных, возвращаем пустой результат
  if (mouseTrajectory.length === 0) {
    return {
      totalEvents: 0,
      duration: 0,
      eventsPerSecond: 0
    };
  }
  
  // Вычисляем общее время активности
  const firstEvent = mouseTrajectory[0];
  const lastEvent = mouseTrajectory[mouseTrajectory.length - 1];
  const duration = lastEvent.timestamp - firstEvent.timestamp; // в миллисекундах
  
  // Вычисляем среднее количество событий в секунду
  const eventsPerSecond = duration > 0 
    ? Math.round((mouseTrajectory.length / duration) * 1000 * 100) / 100 
    : 0;
  
  return {
    totalEvents: mouseTrajectory.length,
    duration: duration, // время в миллисекундах
    eventsPerSecond: eventsPerSecond
  };
}

// Экспортируем функцию для использования в основном модуле
export { calculateMouseActivityBeforeSending };

