// Класс для отслеживания активности пользователя.
// Хранит данные в localStorage:
// - количество визитов
// - время последнего визита  
// - количество попыток отправки форм
// - количество успешных отправок
// - время последней успешной отправки (для блокировки)
export default class UserActivityTracker {
    constructor() {
        // Ключи для localStorage
        this.STORAGE_KEYS = {
            VISIT_COUNT: 'user_visit_count',
            LAST_VISIT_TIME: 'user_last_visit_time',
            SUBMIT_ATTEMPTS: 'user_submit_attempts',
            SUCCESSFUL_SUBMITS: 'user_successful_submits',
            LAST_SUBMIT_TIME: 'user_last_submit_time',
            REPEAT_SUBMIT_CONFIRMED: 'user_repeat_submit_confirmed'
        };

        // Настройки
        this.VISIT_TIMEOUT = 30 * 60 * 1000; // 30 минут в миллисекундах
        this.BLOCK_DURATION = 60 * 60 * 1000; // 1 час в миллисекундах для блокировки

        // Инициализация: проверяем и обновляем счетчик визитов
        this.initVisitTracking();
    }

    // Получить значение из localStorage или вернуть default
    getStorageValue(key, defaultValue = 0) {
        try {
            const value = localStorage.getItem(key);
            return value !== null ? parseInt(value, 10) : defaultValue;
        } catch (error) {
            console.warn(`UserActivityTracker: не удалось прочитать ${key}`, error);
            return defaultValue;
        }
    }

    // Сохранить значение в localStorage
    setStorageValue(key, value) {
        try {
            localStorage.setItem(key, value.toString());
        } catch (error) {
            console.warn(`UserActivityTracker: не удалось сохранить ${key}`, error);
        }
    }

    // Инициализация отслеживания визитов.
    // Если прошло больше 30 минут с последнего визита - увеличиваем счетчик.
    initVisitTracking() {
        const now = Date.now();
        const lastVisitTime = this.getStorageValue(this.STORAGE_KEYS.LAST_VISIT_TIME, 0);
        const visitCount = this.getStorageValue(this.STORAGE_KEYS.VISIT_COUNT, 0);

        // Если это первый визит или прошло больше 30 минут - считаем новым визитом
        if (lastVisitTime === 0 || (now - lastVisitTime) > this.VISIT_TIMEOUT) {
            const newVisitCount = visitCount + 1;
            this.setStorageValue(this.STORAGE_KEYS.VISIT_COUNT, newVisitCount);
            // Логирование только в development
            if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
                console.log(`UserActivityTracker: визит #${newVisitCount}`);
            }
        }

        // Обновляем время последнего визита
        this.setStorageValue(this.STORAGE_KEYS.LAST_VISIT_TIME, now);
    }

    // Увеличить счетчик попыток отправки формы.
    // Вызывается когда пользователь нажал "Отправить" с валидными полями.
    incrementSubmitAttempts() {
        const current = this.getStorageValue(this.STORAGE_KEYS.SUBMIT_ATTEMPTS, 0);
        this.setStorageValue(this.STORAGE_KEYS.SUBMIT_ATTEMPTS, current + 1);
        // Логирование только в development
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
            console.log(`UserActivityTracker: попытка отправки #${current + 1}`);
        }
    }

    // Увеличить счетчик успешных отправок.
    // Вызывается после успешной отправки формы на сервер.
    incrementSuccessfulSubmits() {
        const now = Date.now();
        const current = this.getStorageValue(this.STORAGE_KEYS.SUCCESSFUL_SUBMITS, 0);
        this.setStorageValue(this.STORAGE_KEYS.SUCCESSFUL_SUBMITS, current + 1);
        this.setStorageValue(this.STORAGE_KEYS.LAST_SUBMIT_TIME, now);
        // Логирование только в development
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
            console.log(`UserActivityTracker: успешная отправка #${current + 1}`);
        }
    }

    // Отметить, что пользователь осознанно подтвердил повторную отправку.
    // Устанавливаем флаг, который будет передан в форме.
    markRepeatSubmitConfirmed() {
        this.setStorageValue(this.STORAGE_KEYS.REPEAT_SUBMIT_CONFIRMED, 1);
    }

    // Сбросить флаг подтверждения повторной отправки.
    // Вызывается после успешной отправки, чтобы следующая требовала нового подтверждения.
    resetRepeatSubmitConfirmed() {
        this.setStorageValue(this.STORAGE_KEYS.REPEAT_SUBMIT_CONFIRMED, 0);
    }

    // Проверить, заблокирована ли отправка форм.
    // Возвращает объект: { blocked: boolean, timeLeft: number }
    // timeLeft - сколько минут осталось до разблокировки (округлённо)
    checkIfBlocked() {
        const now = Date.now();
        const lastSubmitTime = this.getStorageValue(this.STORAGE_KEYS.LAST_SUBMIT_TIME, 0);

        // Если есть последняя отправка и прошло меньше часа
        if (lastSubmitTime > 0) {
            const timePassed = now - lastSubmitTime;
            if (timePassed < this.BLOCK_DURATION) {
                const timeLeft = Math.ceil((this.BLOCK_DURATION - timePassed) / (60 * 1000)); // в минутах
                return {
                    blocked: true,
                    timeLeft: timeLeft
                };
            }
        }

        return { blocked: false, timeLeft: 0 };
    }

    // Получить все данные активности для отправки в форме.
    // Возвращает объект с ключами для добавления в FormData.
    getActivityData() {
        return {
            user_visit_count: this.getStorageValue(this.STORAGE_KEYS.VISIT_COUNT, 0),
            user_submit_attempts: this.getStorageValue(this.STORAGE_KEYS.SUBMIT_ATTEMPTS, 0),
            user_successful_submits: this.getStorageValue(this.STORAGE_KEYS.SUCCESSFUL_SUBMITS, 0),
            user_repeat_confirmed: this.getStorageValue(this.STORAGE_KEYS.REPEAT_SUBMIT_CONFIRMED, 0)
        };
    }

    // Проверить, есть ли уже успешные отправки.
    // Используется для показа модального окна подтверждения.
    hasSuccessfulSubmits() {
        return this.getStorageValue(this.STORAGE_KEYS.SUCCESSFUL_SUBMITS, 0) > 0;
    }

    // Сброс всех данных (для тестирования или по запросу пользователя)
    resetAll() {
        Object.values(this.STORAGE_KEYS).forEach(key => {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.warn(`UserActivityTracker: не удалось удалить ${key}`, error);
            }
        });
        // Логирование только в development
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
            console.log('UserActivityTracker: все данные сброшены');
        }
    }
}

