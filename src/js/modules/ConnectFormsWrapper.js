import { connectForms as originalConnectForms } from '@alexsab-ru/scripts';
import { formsIntegration } from './EnhancedFormsIntegration';

// Обертка для connectForms с добавлением расширенной функциональности.
// Перехватывает процесс отправки и добавляет:
// - данные активности пользователя в FormData
// - увеличение счетчиков после успешной отправки
export function connectFormsWithTracking(url, props = {}) {
    // Сохраняем оригинальные callback если они есть
    const originalCallback = props.callback;
    const originalCallbackError = props.callback_error;

    // Создаем обертку для callback успеха
    const wrappedCallback = (data) => {
        // Уведомляем нашу систему об успешной отправке
        formsIntegration.notifySuccessfulSubmit();
        
        // Вызываем оригинальный callback если он был
        if (originalCallback && typeof originalCallback === 'function') {
            originalCallback(data);
        }
    };

    // Создаем обертку для callback ошибки (без изменений, просто прокидываем)
    const wrappedCallbackError = (error) => {
        if (originalCallbackError && typeof originalCallbackError === 'function') {
            originalCallbackError(error);
        }
    };

    // Патчим fetch для перехвата и добавления данных активности
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
        // Проверяем что это наш POST-запрос для форм
        if (init && init.method === 'POST' && init.body && input === url) {
            try {
                // Если дошли до fetch - значит валидация УЖЕ прошла успешно!
                // Увеличиваем счетчик попыток отправки (только для валидных форм)
                formsIntegration.getHandler().tracker.incrementSubmitAttempts();
                
                // Извлекаем FormData из URLSearchParams
                const params = new URLSearchParams(init.body);
                
                // Добавляем данные активности пользователя
                const activityData = formsIntegration.getHandler().tracker.getActivityData();
                Object.entries(activityData).forEach(([key, value]) => {
                    params.append(key, value);
                });

                // Обновляем body с новыми данными
                init.body = params;
                
                // Логирование только в development
                if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
                    console.log('ConnectFormsWrapper: форма валидна, данные активности добавлены');
                }
            } catch (error) {
                // Ошибки логируем всегда (важно для отладки на production)
                console.warn('ConnectFormsWrapper: не удалось добавить данные активности', error);
            }
        }

        // Вызываем оригинальный fetch
        return originalFetch.call(window, input, init);
    };

    // Вызываем оригинальный connectForms с обернутыми callback
    originalConnectForms(url, {
        ...props,
        callback: wrappedCallback,
        callback_error: wrappedCallbackError
    });

    // Восстанавливаем оригинальный fetch через 100ms (чтобы не затронуть другие запросы)
    // На самом деле, лучше не восстанавливать, т.к. нам нужно перехватывать все отправки форм
    // setTimeout(() => {
    //     window.fetch = originalFetch;
    // }, 100);
}

export default connectFormsWithTracking;

