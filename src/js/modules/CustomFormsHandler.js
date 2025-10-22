import UserActivityTracker from './UserActivityTracker';
import { showMessageModal, errorIcon, successIcon, messageModal } from '@alexsab-ru/scripts';

const InfoIcon = '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><path fill="#7ba343" d="M26,0A26,26,0,1,0,52,26,26,26,0,0,0,26,0Zm9.6,17.5a1.94,1.94,0,0,1,2,2,2,2,0,1,1-2-2Zm-19.2,0a1.94,1.94,0,0,1,2,2,2,2,0,1,1-2-2Zm24,16.6C37.93,38.29,33,40.5,26,40.5s-11.93-2.21-14.36-6.4a1,1,0,1,1,1.72-1c2.09,3.58,6.34,5.4,12.64,5.4s10.55-1.82,12.64-5.4a1,1,0,1,1,1.72,1Z"/></svg>';

// Кастомный обработчик форм с расширенной функциональностью.
// Добавляет:
// - отслеживание активности пользователя
// - блокировку отправки на 1 час после успешной отправки
// - модальное окно для подтверждения повторной отправки
// - передачу данных активности в форму
export default class CustomFormsHandler {
    constructor() {
        this.tracker = new UserActivityTracker();
        this.blockedModalShown = false;
    }

    // Проверка блокировки перед отправкой формы.
    // Если форма заблокирована - показываем сообщение и возвращаем true.
    // Если не заблокирована - возвращаем false (можно продолжать).
    checkBlockAndShowMessage() {
        const blockStatus = this.tracker.checkIfBlocked();
        
        if (blockStatus.blocked) {
            // Формируем понятное сообщение с временем
            const hoursLeft = Math.floor(blockStatus.timeLeft / 60);
            const minutesLeft = blockStatus.timeLeft % 60;
            
            let timeMessage = '';
            if (hoursLeft > 0) {
                timeMessage = `${hoursLeft} ч. ${minutesLeft} мин.`;
            } else {
                timeMessage = `${minutesLeft} мин.`;
            }

            const blockMessage = `
                <b class="text-bold block text-2xl mb-4">Заявка уже отправлена</b>
                Вы уже отправили заявку. С Вами обязательно свяжутся в ближайшее рабочее время!
                <br><br>
                <small>Повторная отправка будет доступна через ${timeMessage}</small>
            `;

            if (messageModal) {
                showMessageModal(messageModal, InfoIcon, blockMessage);
            } else {
                alert('Вы уже отправили заявку. С Вами обязательно свяжутся в ближайшее рабочее время!');
            }

            return true; // заблокировано
        }

        return false; // не заблокировано
    }

    // Проверка необходимости показа модального окна подтверждения повторной отправки.
    // Показываем если:
    // - есть успешные отправки
    // - НЕ установлен флаг блокировки (его проверяем выше)
    // Возвращает true если нужно показать модалку (и прервать отправку).
    checkAndShowConfirmModal(form, onConfirm) {
        // Если уже есть успешные отправки, но блокировка снята (прошел час)
        if (this.tracker.hasSuccessfulSubmits()) {
            const confirmModal = document.getElementById('confirm-modal');
            if (!confirmModal) {
                console.warn('CustomFormsHandler: confirm-modal не найден в DOM');
                return false;
            }

            // Текст для модального окна
            const confirmText = `
                <b class="text-bold block text-xl mb-4">Повторная заявка?</b>
                Вы уже отправляли заявку ранее. 
                Действительно хотите отправить ещё одну?
            `;
            
            confirmModal.querySelector('p').innerHTML = confirmText;
            confirmModal.classList.remove("hidden");

            const accept = confirmModal.querySelector('#accept-confirm');
            const acceptClose = confirmModal.querySelector('#accept-close');

            // Удаляем старые обработчики
            const newAccept = accept.cloneNode(true);
            const newAcceptClose = acceptClose.cloneNode(true);
            accept.replaceWith(newAccept);
            acceptClose.replaceWith(newAcceptClose);

            // Обработчик подтверждения
            newAccept.addEventListener('click', () => {
                confirmModal.classList.add("hidden");
                // Отмечаем что пользователь подтвердил повторную отправку
                this.tracker.markRepeatSubmitConfirmed();
                // Продолжаем отправку
                onConfirm();
            }, { once: true });

            // Обработчик отмены
            newAcceptClose.addEventListener('click', () => {
                confirmModal.classList.add("hidden");
                form.reset();
                // Сбрасываем флаг подтверждения
                this.tracker.resetRepeatSubmitConfirmed();
            }, { once: true });

            return true; // показали модалку, прерываем отправку
        }

        return false; // модалку не показываем, продолжаем
    }

    // Добавить данные активности пользователя в FormData.
    // Вызывается перед отправкой формы на сервер.
    appendActivityData(formData) {
        const activityData = this.tracker.getActivityData();
        
        // Добавляем все поля активности в FormData
        Object.entries(activityData).forEach(([key, value]) => {
            formData.append(key, value);
        });

        // Логирование только в development
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
            console.log('CustomFormsHandler: добавлены данные активности:', activityData);
        }
    }

    // Вызывается когда форма прошла валидацию и готова к отправке.
    // Увеличиваем счетчик попыток.
    onValidFormSubmitAttempt() {
        this.tracker.incrementSubmitAttempts();
    }

    // Вызывается после успешной отправки формы на сервер.
    // Увеличиваем счетчик успешных отправок и сбрасываем флаг подтверждения.
    onSuccessfulSubmit() {
        this.tracker.incrementSuccessfulSubmits();
        this.tracker.resetRepeatSubmitConfirmed();
    }

    // Метод для интеграции с существующим connectForms.
    // Возвращает объект с callback-функциями, которые можно передать в connectForms.
    getCallbacks() {
        return {
            // Вызывается перед отправкой формы (после валидации)
            beforeSubmit: (formData, form) => {
                // 1. Проверяем блокировку
                if (this.checkBlockAndShowMessage()) {
                    return false; // блокируем отправку
                }

                // 2. Увеличиваем счетчик попыток
                this.onValidFormSubmitAttempt();

                // 3. Добавляем данные активности
                this.appendActivityData(formData);

                return true; // разрешаем отправку
            },

            // Вызывается при успешной отправке
            onSuccess: (data) => {
                this.onSuccessfulSubmit();
                
                // Показываем стандартное сообщение успеха
                if (messageModal) {
                    const successText = '<b class="text-bold block text-2xl mb-4">Спасибо!</b> В скором времени мы свяжемся с Вами!';
                    showMessageModal(messageModal, successIcon, successText);
                }
            },

            // Вызывается при ошибке отправки
            onError: (error) => {
                // Показываем стандартное сообщение ошибки
                if (messageModal) {
                    const errorText = '<b class="text-bold block text-2xl mb-4">Упс!</b> Что-то пошло не так. Перезагрузите страницу и попробуйте снова.';
                    showMessageModal(messageModal, InfoIcon, errorText);
                }
            }
        };
    }

    // Вспомогательный метод для тестирования - сбросить все данные
    reset() {
        this.tracker.resetAll();
    }
}

// Экспортируем также tracker для прямого доступа если нужно
export { UserActivityTracker };

