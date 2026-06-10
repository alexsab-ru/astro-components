// Debounce-функция, чтобы не спамить обработку при resize
function debounce(func, wait = 100) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Устанавливает фон в зависимости от ширины экрана
function updateImageForElement(el) {
  const width = window.innerWidth;
  const { imageMobile, imageTablet, imageDesktop } = el.dataset;

  let imageUrl = imageDesktop;

  if (width <= 768 && imageMobile) {
    imageUrl = imageMobile;
  } else if (width <= 1024 && imageTablet) {
    imageUrl = imageTablet;
  }

  el.style.backgroundImage = `url('${imageUrl}')`;
}

// Главная функция — запускается сразу
function init() {
  const elements = document.querySelectorAll('[data-bg-id]');
  if (!elements.length) return;

  // Ставим фон при загрузке
  elements.forEach(updateImageForElement);

  // Обновляем фон при ресайзе (дебаунс)
  if (!window.__bgResizeHandlerAttached) {
    window.addEventListener('resize', debounce(() => {
      document.querySelectorAll('[data-bg-id]').forEach(updateImageForElement);
    }));
    window.__bgResizeHandlerAttached = true;
  }
}

// Запускаем при загрузке страницы
window.addEventListener('DOMContentLoaded', init);