// ========== КОНСТАНТЫ ==========

// Типы устройств
const DEVICE_TYPE = {
  DESKTOP: 'desktop',
  MOBILE: 'mobile',
  TABLET: 'tablet'
};

// Операционные системы
const OS_IDENTIFIERS = {
  IOS: 'iOS',
  ANDROID: 'Android',
  IPHONE: 'iPhone'
};

// Возможные результаты анализа
const ANALYSIS_RESULT = {
  HUMAN: 'человек',
  BOT: 'бот',
  SUSPICIOUS: 'подозрительно'
};

// Критические временные пороги (в миллисекундах)
const TIME_THRESHOLDS = {
  CRITICAL_FAST: 1000,    // Менее 1 секунды - невозможно для человека
  MIN_NORMAL: 3000,       // Минимальное нормальное время заполнения (3 секунды)
  MIN_VARIANCE: 5         // Минимальная вариация времени между событиями мыши
};

// Минимальное количество подозрительных признаков для определения бота
const SUSPICIOUS_COUNT_THRESHOLD = 2;

// ========== ФУНКЦИИ ==========

/**
 * Анализирует все собранные метрики и определяет, является ли пользователь человеком или ботом
 * @param {Object} data - Объект с полными данными о поведении пользователя
 * @param {Object} criteria - Объект с критериями для определения бота
 * @returns {string} ANALYSIS_RESULT.HUMAN | ANALYSIS_RESULT.BOT | ANALYSIS_RESULT.SUSPICIOUS
 */
function calculateResult(data, criteria) {
  // Проверяем, что данные собраны
  if (!data || !data.device) {
    console.warn('⚠️ Недостаточно данных для анализа');
    return ANALYSIS_RESULT.SUSPICIOUS;
  }
  
  // Массив для сбора подозрительных признаков
  const suspiciousFlags = [];
  
  // === КРИТИЧЕСКИЕ ПРОВЕРКИ (сами по себе указывают на бота) ===
  
  // 1. Обнаружен headless браузер - это почти 100% бот
  if (data.device.headless && data.device.headless.isHeadless) {
    console.warn('🚨 КРИТИЧНО: Обнаружен headless браузер!', data.device.headless.suspiciousFeatures);
    return ANALYSIS_RESULT.BOT;
  }
  
  // 2. Слишком быстрое заполнение формы (менее критического порога) - невозможно для человека
  if (data.formFillingTime !== null && data.formFillingTime < TIME_THRESHOLDS.CRITICAL_FAST) {
    console.warn(`🚨 КРИТИЧНО: Форма заполнена менее чем за ${TIME_THRESHOLDS.CRITICAL_FAST}ms!`);
    return ANALYSIS_RESULT.BOT;
  }
  
  // === ПРОВЕРКИ В ЗАВИСИМОСТИ ОТ ТИПА УСТРОЙСТВА ===
  
  const deviceType = data.device.type || DEVICE_TYPE.DESKTOP;
  const isMobile = deviceType === DEVICE_TYPE.MOBILE || 
                   deviceType === DEVICE_TYPE.TABLET || 
                   data.device.touchSupport;
  
  if (isMobile) {
    // ============ ПРОВЕРКИ ДЛЯ МОБИЛЬНЫХ УСТРОЙСТВ ============
    console.log('📱 Анализ мобильного устройства');
    
    // Для мобильных используем упрощенные критерии
    
    // 1. Проверяем время заполнения
    if (data.formFillingTime !== null && data.formFillingTime < TIME_THRESHOLDS.MIN_NORMAL) {
      suspiciousFlags.push({
        type: 'form_time_too_fast',
        value: data.formFillingTime,
        threshold: TIME_THRESHOLDS.MIN_NORMAL,
        message: `Время заполнения: ${data.formFillingTime}ms (< ${TIME_THRESHOLDS.MIN_NORMAL}ms)`
      });
    }
    
    // 2. Проверяем соответствие User Agent и OS
    const userAgent = data.device.userAgent || '';
    const os = data.device.os || '';
    
    // Пример: iOS устройство не может иметь Android в User Agent
    if (os.includes(OS_IDENTIFIERS.IOS) && userAgent.includes(OS_IDENTIFIERS.ANDROID)) {
      suspiciousFlags.push({
        type: 'ua_mismatch',
        message: `Несоответствие OS (${OS_IDENTIFIERS.IOS}) и User Agent (${OS_IDENTIFIERS.ANDROID})`
      });
    }
    
    // Пример: Android устройство не может иметь iPhone в User Agent
    if (os.includes(OS_IDENTIFIERS.ANDROID) && userAgent.includes(OS_IDENTIFIERS.IPHONE)) {
      suspiciousFlags.push({
        type: 'ua_mismatch',
        message: `Несоответствие OS (${OS_IDENTIFIERS.ANDROID}) и User Agent (${OS_IDENTIFIERS.IPHONE})`
      });
    }
    
  } else {
    // ============ ПРОВЕРКИ ДЛЯ ДЕСКТОПНЫХ УСТРОЙСТВ ============
    console.log('🖥️ Анализ десктопного устройства');
    
    // 1. Критическая проверка: полное отсутствие движения мыши на desktop
    if (data.mouseBehavior.mouseActivityBeforeSending === 0) {
      console.warn(`🚨 КРИТИЧНО: Нет движения мыши вообще на ${DEVICE_TYPE.DESKTOP} устройстве!`);
      return ANALYSIS_RESULT.BOT;
    }
    
    // 2. Проверяем количество изменений направления
    if (data.mouseBehavior.directionChanges !== null && 
        data.mouseBehavior.directionChanges < criteria.DIRECTION_CHANGES) {
      suspiciousFlags.push({
        type: 'direction_changes',
        value: data.mouseBehavior.directionChanges,
        threshold: criteria.DIRECTION_CHANGES,
        message: `Мало изменений направления: ${data.mouseBehavior.directionChanges} (< ${criteria.DIRECTION_CHANGES})`
      });
    }
    
    // 3. Проверяем плавность траектории
    if (data.mouseBehavior.smoothnessScore !== null && 
        data.mouseBehavior.smoothnessScore > 0 &&
        data.mouseBehavior.smoothnessScore < criteria.SMOOTHNESS_SCORE) {
      suspiciousFlags.push({
        type: 'smoothness_score',
        value: data.mouseBehavior.smoothnessScore,
        threshold: criteria.SMOOTHNESS_SCORE,
        message: `Слишком прямая траектория: ${data.mouseBehavior.smoothnessScore} (< ${criteria.SMOOTHNESS_SCORE})`
      });
    }
    
    // 4. Проверяем вариацию скорости
    if (data.mouseBehavior.speedAndAcceleration !== null && 
        data.mouseBehavior.speedAndAcceleration < criteria.SPEED_AND_ACCELERATION) {
      suspiciousFlags.push({
        type: 'speed_variance',
        value: data.mouseBehavior.speedAndAcceleration,
        threshold: criteria.SPEED_AND_ACCELERATION,
        message: `Низкая вариация скорости: ${data.mouseBehavior.speedAndAcceleration} (< ${criteria.SPEED_AND_ACCELERATION})`
      });
    }
    
    // 5. Проверяем интервалы между событиями мыши
    if (data.mouseBehavior.timeBetweenMouseEvents !== null && 
        data.mouseBehavior.timeBetweenMouseEvents < TIME_THRESHOLDS.MIN_VARIANCE) {
      suspiciousFlags.push({
        type: 'time_variance',
        value: data.mouseBehavior.timeBetweenMouseEvents,
        threshold: TIME_THRESHOLDS.MIN_VARIANCE,
        message: `Слишком равномерные интервалы: ${data.mouseBehavior.timeBetweenMouseEvents}ms (< ${TIME_THRESHOLDS.MIN_VARIANCE}ms)`
      });
    }
    
    // 6. Проверяем общую активность мыши
    if (data.mouseBehavior.mouseActivityBeforeSending !== null && 
        data.mouseBehavior.mouseActivityBeforeSending < criteria.MOUSE_ACTIVITY_BEFORE_SENDING) {
      suspiciousFlags.push({
        type: 'mouse_activity',
        value: data.mouseBehavior.mouseActivityBeforeSending,
        threshold: criteria.MOUSE_ACTIVITY_BEFORE_SENDING,
        message: `Низкая активность мыши: ${data.mouseBehavior.mouseActivityBeforeSending} событий (< ${criteria.MOUSE_ACTIVITY_BEFORE_SENDING})`
      });
    }
    
    // 7. Проверяем время заполнения формы
    if (data.formFillingTime !== null && data.formFillingTime < TIME_THRESHOLDS.MIN_NORMAL) {
      suspiciousFlags.push({
        type: 'form_time',
        value: data.formFillingTime,
        threshold: TIME_THRESHOLDS.MIN_NORMAL,
        message: `Быстрое заполнение: ${data.formFillingTime}ms (< ${TIME_THRESHOLDS.MIN_NORMAL}ms)`
      });
    }
  }
  
  // === ИТОГОВОЕ РЕШЕНИЕ ===
  
  const suspiciousCount = suspiciousFlags.length;
  
  // Логируем результаты анализа
  if (suspiciousCount === 0) {
    console.log('✅ Анализ завершен: Все проверки пройдены');
    return ANALYSIS_RESULT.HUMAN;
  } else if (suspiciousCount === 1) {
    console.log('⚠️ Анализ завершен: Обнаружен 1 подозрительный признак');
    console.log('Признак:', suspiciousFlags[0]);
    return ANALYSIS_RESULT.SUSPICIOUS;
  } else if (suspiciousCount >= SUSPICIOUS_COUNT_THRESHOLD) {
    console.warn(`🚨 Анализ завершен: Обнаружено ${suspiciousCount} подозрительных признаков`);
    console.warn('Признаки:', suspiciousFlags);
    return ANALYSIS_RESULT.BOT;
  }
  
  // Этот случай не должен произойти, но на всякий случай
  return ANALYSIS_RESULT.SUSPICIOUS;
}

/**
 * Получает детальную информацию о подозрительных признаках
 * Полезно для отладки и логирования на сервере
 * @param {Object} data - Объект с полными данными о поведении пользователя
 * @param {Object} criteria - Объект с критериями для определения бота
 * @returns {Object} Объект с результатом и детальной информацией
 */
function getDetailedAnalysis(data, criteria) {
  const result = calculateResult(data, criteria);
  
  return {
    result: result,
    deviceType: data.device?.type || 'unknown',
    isMobile: data.device?.type === DEVICE_TYPE.MOBILE || 
              data.device?.type === DEVICE_TYPE.TABLET || 
              data.device?.touchSupport,
    headlessDetected: data.device?.headless?.isHeadless || false,
    formFillingTime: data.formFillingTime,
    timestamp: Date.now()
  };
}

// Экспортируем функции и константы
export { 
  calculateResult, 
  getDetailedAnalysis,
  ANALYSIS_RESULT,
  DEVICE_TYPE,
  OS_IDENTIFIERS,
  TIME_THRESHOLDS
};

