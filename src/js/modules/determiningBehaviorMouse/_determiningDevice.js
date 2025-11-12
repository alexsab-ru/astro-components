/**
 * Определяет тип устройства (desktop, mobile, tablet)
 * @returns {string} Тип устройства
 */
function getDeviceType() {
  const ua = navigator.userAgent;
  
  // Проверяем на планшет
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  
  // Проверяем на мобильное устройство
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  
  // По умолчанию - десктоп
  return 'desktop';
}

/**
 * Определяет операционную систему
 * @returns {string} Название ОС
 */
function getOS() {
  const ua = navigator.userAgent;
  
  if (/Windows NT 10.0/.test(ua)) return 'Windows 10';
  if (/Windows NT 6.3/.test(ua)) return 'Windows 8.1';
  if (/Windows NT 6.2/.test(ua)) return 'Windows 8';
  if (/Windows NT 6.1/.test(ua)) return 'Windows 7';
  if (/Windows/.test(ua)) return 'Windows';
  
  if (/Mac OS X/.test(ua)) {
    const version = ua.match(/Mac OS X ([\d_]+)/);
    return version ? `macOS ${version[1].replace(/_/g, '.')}` : 'macOS';
  }
  
  if (/Android/.test(ua)) {
    const version = ua.match(/Android ([\d.]+)/);
    return version ? `Android ${version[1]}` : 'Android';
  }
  
  if (/iPhone|iPad|iPod/.test(ua)) {
    const version = ua.match(/OS ([\d_]+)/);
    return version ? `iOS ${version[1].replace(/_/g, '.')}` : 'iOS';
  }
  
  if (/Linux/.test(ua)) return 'Linux';
  
  return 'Unknown';
}

/**
 * Определяет браузер и его версию
 * @returns {Object} Информация о браузере {name, version}
 */
function getBrowser() {
  const ua = navigator.userAgent;
  let name = 'Unknown';
  let version = 'Unknown';
  
  // Проверяем в определенном порядке (более специфичные первыми)
  
  // Edge (новый на Chromium)
  if (/Edg\//.test(ua)) {
    name = 'Edge';
    const match = ua.match(/Edg\/([\d.]+)/);
    version = match ? match[1] : version;
  }
  // Opera
  else if (/OPR\//.test(ua) || /Opera\//.test(ua)) {
    name = 'Opera';
    const match = ua.match(/(?:OPR|Opera)\/([\d.]+)/);
    version = match ? match[1] : version;
  }
  // Chrome
  else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) {
    name = 'Chrome';
    const match = ua.match(/Chrome\/([\d.]+)/);
    version = match ? match[1] : version;
  }
  // Safari (должен быть после Chrome, т.к. Chrome тоже содержит Safari в UA)
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) {
    name = 'Safari';
    const match = ua.match(/Version\/([\d.]+)/);
    version = match ? match[1] : version;
  }
  // Firefox
  else if (/Firefox\//.test(ua)) {
    name = 'Firefox';
    const match = ua.match(/Firefox\/([\d.]+)/);
    version = match ? match[1] : version;
  }
  // Internet Explorer
  else if (/MSIE|Trident\//.test(ua)) {
    name = 'Internet Explorer';
    const match = ua.match(/(?:MSIE |rv:)([\d.]+)/);
    version = match ? match[1] : version;
  }
  
  return { name, version };
}

/**
 * Проверяет поддержку touch-событий
 * @returns {boolean} true если устройство поддерживает touch
 */
function hasTouchSupport() {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Получает информацию о экране
 * @returns {Object} Информация о экране
 */
function getScreenInfo() {
  return {
    // Размер экрана устройства
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    // Доступная область (без панелей браузера)
    availableWidth: window.screen.availWidth,
    availableHeight: window.screen.availHeight,
    // Размер окна браузера
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    // Плотность пикселей (для retina дисплеев это 2 или больше)
    pixelRatio: window.devicePixelRatio || 1,
    // Глубина цвета
    colorDepth: window.screen.colorDepth,
    // Ориентация экрана (для мобильных)
    orientation: window.screen.orientation?.type || 'unknown'
  };
}

/**
 * Получает информацию о языке и локализации
 * @returns {Object} Информация о языке
 */
function getLanguageInfo() {
  return {
    // Предпочитаемый язык пользователя
    language: navigator.language || navigator.userLanguage,
    // Все языки в порядке предпочтения
    languages: navigator.languages || [navigator.language],
    // Временная зона
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    // Смещение от UTC в минутах
    timezoneOffset: new Date().getTimezoneOffset()
  };
}

/**
 * Получает информацию о сетевом подключении (если доступно)
 * @returns {Object|null} Информация о подключении или null
 */
function getConnectionInfo() {
  // Network Information API не поддерживается всеми браузерами
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  if (!connection) {
    return null;
  }
  
  return {
    // Эффективный тип подключения (slow-2g, 2g, 3g, 4g)
    effectiveType: connection.effectiveType,
    // Примерная скорость в Мбит/с
    downlink: connection.downlink,
    // Примерная задержка в мс
    rtt: connection.rtt,
    // Режим экономии трафика
    saveData: connection.saveData || false
  };
}

/**
 * Проверяет признаки headless браузера (используется ботами)
 * @returns {Object} Объект с подозрительными признаками
 */
function detectHeadlessFeatures() {
  const suspicious = [];
  
  // Проверка на Headless Chrome
  if (navigator.webdriver) {
    suspicious.push('webdriver_flag');
  }
  
  // Проверка на отсутствие плагинов (часто у ботов)
  if (navigator.plugins.length === 0) {
    suspicious.push('no_plugins');
  }
  
  // Проверка на странные размеры экрана
  if (window.outerWidth === 0 || window.outerHeight === 0) {
    suspicious.push('zero_outer_dimensions');
  }
  
  // Проверка на несоответствие размеров
  if (window.outerWidth < window.innerWidth || window.outerHeight < window.innerHeight) {
    suspicious.push('dimension_mismatch');
  }
  
  // Проверка на отсутствие chrome объекта (для Chrome)
  if (/Chrome/.test(navigator.userAgent) && !window.chrome) {
    suspicious.push('missing_chrome_object');
  }
  
  // Проверка на Phantom.js
  if (window.callPhantom || window._phantom) {
    suspicious.push('phantomjs_detected');
  }
  
  // Проверка на некоторые автоматизированные инструменты
  if (window.Buffer || window.emit || window.spawn) {
    suspicious.push('automation_tools_detected');
  }
  
  return {
    isHeadless: suspicious.length > 0,
    suspiciousFeatures: suspicious
  };
}

/**
 * Получает информацию о hardware
 * @returns {Object} Информация о железе
 */
function getHardwareInfo() {
  return {
    // Количество логических процессоров
    cpuCores: navigator.hardwareConcurrency || 'unknown',
    // Примерный объем памяти устройства в ГБ (только Chrome)
    deviceMemory: navigator.deviceMemory || 'unknown',
    // Максимальное количество точек касания
    maxTouchPoints: navigator.maxTouchPoints || 0,
    // Поддержка WebGL (важно для рендеринга)
    webGLSupport: !!window.WebGLRenderingContext,
    // Vendor графической карты (если доступно)
    gpuVendor: getGPUInfo()
  };
}

/**
 * Пытается получить информацию о GPU
 * @returns {string} Информация о GPU или 'unknown'
 */
function getGPUInfo() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        return gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      }
    }
  } catch (e) {
    // Игнорируем ошибки
  }
  
  return 'unknown';
}

/**
 * Собирает всю информацию об устройстве
 * @returns {Object} Полная информация об устройстве
 */
function getDeviceInfo() {
  const deviceType = getDeviceType();
  const os = getOS();
  const browser = getBrowser();
  const screen = getScreenInfo();
  const language = getLanguageInfo();
  const connection = getConnectionInfo();
  const headless = detectHeadlessFeatures();
  const hardware = getHardwareInfo();
  
  return {
    // Основная информация
    type: deviceType, // desktop, mobile, tablet
    os: os,
    browser: browser,
    userAgent: navigator.userAgent,
    
    // Возможности устройства
    touchSupport: hasTouchSupport(),
    
    // Информация о экране
    screen: screen,
    
    // Язык и локализация
    language: language,
    
    // Сетевое подключение (может быть null)
    connection: connection,
    
    // Информация о железе
    hardware: hardware,
    
    // Проверка на headless/bot
    headless: headless,
    
    // Дополнительная информация
    platform: navigator.platform,
    vendor: navigator.vendor,
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack || 'unspecified',
    
    // Время сбора данных
    timestamp: Date.now()
  };
}

// Экспортируем главную функцию
export { getDeviceInfo };

