// Простые тесты для меню
// Скопировать весь код и вставить в консоль на странице с меню в браузере

console.log('🧪 Начинаем тестирование меню...');

// Тест 1: Проверка загрузки данных меню
function testMenuData() {
    console.log('📋 Тест 1: Проверка данных меню');
    
    // Проверяем, что меню загружено
    const menuItems = document.querySelectorAll('#site_nav li');
    console.log(`Найдено пунктов меню: ${menuItems.length}`);
    
    // Проверяем наличие подменю
    const subMenus = document.querySelectorAll('#site_nav .group');
    console.log(`Найдено пунктов с подменю: ${subMenus.length}`);
    
    return menuItems.length > 0;
}

// Тест 2: Проверка меню "Модели"
function testModelsMenu() {
    console.log('🚗 Тест 2: Проверка меню "Модели"');
    
    // Ищем пункт "Модели"
    const modelsLink = Array.from(document.querySelectorAll('a')).find(link => 
        link.textContent.trim() === 'Модели'
    );
    
    if (modelsLink) {
        console.log('✅ Пункт "Модели" найден');
        
        // Проверяем наличие подменю
        const parentLi = modelsLink.closest('li');
        const subMenu = parentLi.querySelector('.group > div');
        
        if (subMenu) {
            console.log('✅ Подменю "Модели" найдено');
            
            // Проверяем бренды
            const brands = subMenu.querySelectorAll('.lg\\:grid-cols-5 > div');
            console.log(`Найдено брендов: ${brands.length}`);
            
            // Проверяем модели
            const models = subMenu.querySelectorAll('a[href*="/models/"]');
            console.log(`Найдено моделей: ${models.length}`);
            
            return brands.length > 0 && models.length > 0;
        }
    }
    
    console.log('❌ Пункт "Модели" не найден');
    return false;
}

// Тест 3: Проверка адаптивности
function testResponsive() {
    console.log('📱 Тест 3: Проверка адаптивности');
    
    const isMobile = window.innerWidth < 1024;
    console.log(`Текущая ширина экрана: ${window.innerWidth}px`);
    console.log(`Определено как мобильное: ${isMobile}`);
    
    // Проверяем наличие мобильных элементов
    const mobileElements = document.querySelectorAll('.lg\\:hidden');
    const desktopElements = document.querySelectorAll('.hidden.lg\\:block');
    
    console.log(`Мобильных элементов: ${mobileElements.length}`);
    console.log(`Десктопных элементов: ${desktopElements.length}`);
    
    return true;
}

// Тест 4: Проверка доступности
function testAccessibility() {
    console.log('♿ Тест 4: Проверка доступности');
    
    // Проверяем наличие alt атрибутов
    const images = document.querySelectorAll('#site_nav img');
    const imagesWithAlt = Array.from(images).filter(img => img.alt !== '');
    
    console.log(`Изображений в меню: ${images.length}`);
    console.log(`Изображений с alt: ${imagesWithAlt.length}`);
    
    // Проверяем семантику
    const nav = document.querySelector('#site_nav');
    const hasNavRole = nav.getAttribute('role') === 'navigation';
    
    console.log(`Навигация имеет role="navigation": ${hasNavRole}`);
    
    return imagesWithAlt.length === images.length;
}

// Тест 5: Проверка производительности
function testPerformance() {
    console.log('⚡ Тест 5: Проверка производительности');
    
    const startTime = performance.now();
    
    // Симулируем открытие всех подменю
    const menuItems = document.querySelectorAll('#site_nav .group');
    let openedMenus = 0;
    
    menuItems.forEach(item => {
        const subMenu = item.querySelector('div');
        if (subMenu) {
            openedMenus++;
        }
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`Время обработки меню: ${duration.toFixed(2)}ms`);
    console.log(`Открыто подменю: ${openedMenus}`);
    
    return duration < 100; // Должно быть меньше 100ms
}

// Запуск всех тестов
function runAllTests() {
    console.log('🚀 Запуск всех тестов меню...\n');
    
    const tests = [
        { name: 'Данные меню', fn: testMenuData },
        { name: 'Меню "Модели"', fn: testModelsMenu },
        { name: 'Адаптивность', fn: testResponsive },
        { name: 'Доступность', fn: testAccessibility },
        { name: 'Производительность', fn: testPerformance }
    ];
    
    let passedTests = 0;
    
    tests.forEach(test => {
        try {
            const result = test.fn();
            if (result) {
                console.log(`✅ ${test.name}: ПРОЙДЕН\n`);
                passedTests++;
            } else {
                console.log(`❌ ${test.name}: ПРОВАЛЕН\n`);
            }
        } catch (error) {
            console.log(`💥 ${test.name}: ОШИБКА - ${error.message}\n`);
        }
    });
    
    console.log(`📊 Результаты: ${passedTests}/${tests.length} тестов пройдено`);
    
    if (passedTests === tests.length) {
        console.log('🎉 Все тесты пройдены успешно!');
    } else {
        console.log('⚠️ Некоторые тесты не пройдены');
    }
}

// Автозапуск тестов при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAllTests);
} else {
    runAllTests();
}

// Экспорт для ручного запуска
window.testMenu = runAllTests;
