// Утилиты для отладки и тестирования системы отслеживания форм.
// Эти функции доступны в консоли браузера через window.formDebug

export class FormTrackingDebug {
    constructor(formsIntegration) {
        this.integration = formsIntegration;
        this.tracker = formsIntegration.getHandler().tracker;
    }

    // Показать все текущие данные активности
    showAll() {
        console.group('📊 Данные активности пользователя');
        
        const data = this.tracker.getActivityData();
        console.table(data);
        
        const lastVisit = this.tracker.getStorageValue(this.tracker.STORAGE_KEYS.LAST_VISIT_TIME);
        const lastSubmit = this.tracker.getStorageValue(this.tracker.STORAGE_KEYS.LAST_SUBMIT_TIME);
        
        console.log('🕐 Последний визит:', lastVisit ? new Date(lastVisit).toLocaleString() : 'Нет данных');
        console.log('🕐 Последняя отправка:', lastSubmit ? new Date(lastSubmit).toLocaleString() : 'Нет данных');
        
        const blockStatus = this.tracker.checkIfBlocked();
        if (blockStatus.blocked) {
            console.log(`🚫 Блокировка активна. Осталось: ${blockStatus.timeLeft} минут`);
        } else {
            console.log('✅ Блокировка неактивна');
        }
        
        console.groupEnd();
    }

    // Показать сырые данные из localStorage
    showRaw() {
        console.group('💾 Данные localStorage');
        Object.entries(this.tracker.STORAGE_KEYS).forEach(([name, key]) => {
            const value = localStorage.getItem(key);
            console.log(`${name} (${key}):`, value);
        });
        console.groupEnd();
    }

    // Симулировать новый визит
    simulateNewVisit() {
        const currentCount = this.tracker.getStorageValue(this.tracker.STORAGE_KEYS.VISIT_COUNT, 0);
        const newCount = currentCount + 1;
        this.tracker.setStorageValue(this.tracker.STORAGE_KEYS.VISIT_COUNT, newCount);
        this.tracker.setStorageValue(this.tracker.STORAGE_KEYS.LAST_VISIT_TIME, Date.now());
        console.log(`✅ Визит увеличен: ${currentCount} → ${newCount}`);
        this.showAll();
    }

    // Симулировать попытку отправки
    simulateSubmitAttempt() {
        this.tracker.incrementSubmitAttempts();
        console.log('✅ Попытка отправки зарегистрирована');
        this.showAll();
    }

    // Симулировать успешную отправку
    simulateSuccessfulSubmit() {
        this.tracker.incrementSuccessfulSubmits();
        console.log('✅ Успешная отправка зарегистрирована');
        this.showAll();
    }

    // Сбросить только блокировку (оставить статистику)
    resetBlock() {
        this.tracker.setStorageValue(this.tracker.STORAGE_KEYS.LAST_SUBMIT_TIME, 0);
        console.log('✅ Блокировка сброшена');
        this.showAll();
    }

    // Установить блокировку на N минут (для тестирования)
    setBlockMinutes(minutes) {
        const now = Date.now();
        const blockDuration = this.tracker.BLOCK_DURATION;
        const targetTime = now - blockDuration + (minutes * 60 * 1000);
        this.tracker.setStorageValue(this.tracker.STORAGE_KEYS.LAST_SUBMIT_TIME, targetTime);
        console.log(`✅ Блокировка установлена на ${minutes} минут`);
        this.showAll();
    }

    // Изменить длительность блокировки (временно, до перезагрузки)
    setBlockDuration(minutes) {
        this.tracker.BLOCK_DURATION = minutes * 60 * 1000;
        console.log(`✅ Длительность блокировки изменена на ${minutes} минут (до перезагрузки страницы)`);
        this.showAll();
    }

    // Изменить таймаут визита (временно, до перезагрузки)
    setVisitTimeout(minutes) {
        this.tracker.VISIT_TIMEOUT = minutes * 60 * 1000;
        console.log(`✅ Таймаут визита изменен на ${minutes} минут (до перезагрузки страницы)`);
    }

    // Полный сброс всех данных
    resetAll() {
        this.integration.reset();
        console.log('✅ Все данные сброшены');
        this.showAll();
    }

    // Экспортировать данные (для сохранения)
    export() {
        const data = {
            activity: this.tracker.getActivityData(),
            timestamps: {
                lastVisit: this.tracker.getStorageValue(this.tracker.STORAGE_KEYS.LAST_VISIT_TIME),
                lastSubmit: this.tracker.getStorageValue(this.tracker.STORAGE_KEYS.LAST_SUBMIT_TIME)
            },
            blockStatus: this.tracker.checkIfBlocked()
        };
        
        console.log('📦 Экспорт данных:');
        console.log(JSON.stringify(data, null, 2));
        
        return data;
    }

    // Импортировать данные (для восстановления)
    import(data) {
        try {
            if (data.activity) {
                Object.entries(data.activity).forEach(([key, value]) => {
                    const storageKey = this.tracker.STORAGE_KEYS[key.toUpperCase().replace('USER_', '')];
                    if (storageKey) {
                        this.tracker.setStorageValue(storageKey, value);
                    }
                });
            }
            
            if (data.timestamps) {
                if (data.timestamps.lastVisit) {
                    this.tracker.setStorageValue(this.tracker.STORAGE_KEYS.LAST_VISIT_TIME, data.timestamps.lastVisit);
                }
                if (data.timestamps.lastSubmit) {
                    this.tracker.setStorageValue(this.tracker.STORAGE_KEYS.LAST_SUBMIT_TIME, data.timestamps.lastSubmit);
                }
            }
            
            console.log('✅ Данные импортированы успешно');
            this.showAll();
        } catch (error) {
            console.error('❌ Ошибка импорта:', error);
        }
    }

    // Показать справку
    help() {
        console.group('📚 Справка по FormTrackingDebug');
        console.log('Доступные команды:');
        console.log('');
        console.log('window.formDebug.showAll()                    - Показать все данные');
        console.log('window.formDebug.showRaw()                    - Показать сырые данные из localStorage');
        console.log('window.formDebug.simulateNewVisit()           - Симулировать новый визит');
        console.log('window.formDebug.simulateSubmitAttempt()      - Симулировать попытку отправки');
        console.log('window.formDebug.simulateSuccessfulSubmit()   - Симулировать успешную отправку');
        console.log('window.formDebug.resetBlock()                 - Сбросить только блокировку');
        console.log('window.formDebug.setBlockMinutes(N)           - Установить блокировку на N минут');
        console.log('window.formDebug.setBlockDuration(N)          - Изменить длительность блокировки на N минут');
        console.log('window.formDebug.setVisitTimeout(N)           - Изменить таймаут визита на N минут');
        console.log('window.formDebug.resetAll()                   - Полный сброс всех данных');
        console.log('window.formDebug.export()                     - Экспортировать данные');
        console.log('window.formDebug.import(data)                 - Импортировать данные');
        console.log('window.formDebug.help()                       - Показать эту справку');
        console.log('');
        console.log('Примеры:');
        console.log('  // Установить блокировку на 5 минут для тестирования');
        console.log('  window.formDebug.setBlockMinutes(5);');
        console.log('');
        console.log('  // Изменить длительность блокировки на 1 минуту');
        console.log('  window.formDebug.setBlockDuration(1);');
        console.log('');
        console.log('  // Быстрый тест цикла отправки');
        console.log('  window.formDebug.simulateSuccessfulSubmit(); // Отправка');
        console.log('  window.formDebug.setBlockMinutes(1);         // Блокировка почти кончилась');
        console.log('  // Подождать 1 минуту и попробовать отправить форму');
        console.groupEnd();
    }
}

export default FormTrackingDebug;

