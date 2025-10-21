import CustomFormsHandler from './CustomFormsHandler';

// Интеграция расширенной функциональности форм с существующей системой.
// Перехватывает события отправки форм и добавляет:
// - проверку блокировки
// - модальное окно подтверждения повторной отправки  
// - отслеживание активности пользователя
// - добавление данных активности в FormData
export class EnhancedFormsIntegration {
    constructor() {
        this.handler = new CustomFormsHandler();
        this.originalFetch = null;
        this.isIntegrated = false;
    }

    // Основной метод интеграции.
    // Перехватывает стандартный процесс отправки форм и добавляет нашу логику.
    integrate() {
        if (this.isIntegrated) {
            console.warn('EnhancedFormsIntegration: уже интегрирован');
            return;
        }

        // Сохраняем оригинальный fetch
        this.originalFetch = window.fetch;

        // Перехватываем все submit-события форм на уровне документа
        document.addEventListener('submit', this.handleFormSubmit.bind(this), true);

        this.isIntegrated = true;
        // Логирование только в development
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
            console.log('EnhancedFormsIntegration: интеграция завершена');
        }
    }

    // Обработчик submit для всех форм.
    // Срабатывает перед стандартной обработкой connectForms.
    handleFormSubmit(event) {
        const form = event.target;

        // Пропускаем vue-формы (они обрабатываются отдельно)
        if (form.classList.contains('vue-form')) {
            return;
        }

        // 1. Проверяем блокировку (1 час после последней отправки)
        if (this.handler.checkBlockAndShowMessage()) {
            event.preventDefault();
            event.stopImmediatePropagation();
            return false;
        }

        // 2. Проверяем нужно ли показать модалку подтверждения
        // Если пользователь уже отправлял формы (но блокировка снята)
        const needsConfirmation = this.handler.tracker.hasSuccessfulSubmits() && 
                                  !this.handler.tracker.getActivityData().user_repeat_confirmed;

        if (needsConfirmation) {
            event.preventDefault();
            event.stopImmediatePropagation();

            // Показываем модалку и передаем callback для продолжения отправки
            this.handler.checkAndShowConfirmModal(form, () => {
                // Пользователь подтвердил - продолжаем отправку
                // Создаем новое событие submit (без нашего обработчика)
                this.triggerFormSubmit(form);
            });

            return false;
        }

        // НЕ увеличиваем счетчик попыток здесь!
        // Счетчик увеличивается только ПОСЛЕ успешной валидации в ConnectFormsWrapper
    }

    // Программная отправка формы без перехвата.
    // Используется когда пользователь подтвердил повторную отправку.
    triggerFormSubmit(form) {
        // Временно удаляем наш обработчик
        document.removeEventListener('submit', this.handleFormSubmit.bind(this), true);
        
        // Отправляем форму
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
        
        // Возвращаем обработчик обратно через небольшую задержку
        setTimeout(() => {
            document.addEventListener('submit', this.handleFormSubmit.bind(this), true);
        }, 100);
    }

    // Патч для добавления данных активности в FormData.
    // Вызываем этот метод вручную из app.js после успешной отправки.
    patchFormDataAppend() {
        // Находим все формы и патчим их метод submit
        document.querySelectorAll('form:not(.vue-form)').forEach(form => {
            const originalSubmit = form.submit;
            
            form.submit = () => {
                // Перед отправкой добавляем данные активности
                const formData = new FormData(form);
                this.handler.appendActivityData(formData);
                
                // Вызываем оригинальный submit
                originalSubmit.call(form);
            };
        });
    }

    // Метод для вызова после успешной отправки формы.
    // Должен быть вызван из callback connectForms.
    notifySuccessfulSubmit() {
        this.handler.onSuccessfulSubmit();
    }

    // Метод для добавления данных активности в существующий FormData.
    // Вызывается из кастомного callback перед отправкой на сервер.
    enrichFormData(formData) {
        this.handler.appendActivityData(formData);
    }

    // Получить инстанс handler для прямого доступа
    getHandler() {
        return this.handler;
    }

    // Сброс всех данных (для тестирования)
    reset() {
        this.handler.reset();
    }
}

// Создаем глобальный инстанс для использования в app.js
export const formsIntegration = new EnhancedFormsIntegration();

// НЕ добавляем в window на production!
// Доступ через window.formsIntegration будет только в development (настраивается в app.js)
// На production используется только внутренний экспорт formsIntegration

