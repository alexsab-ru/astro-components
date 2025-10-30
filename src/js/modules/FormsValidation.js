import { phoneChecker } from "@alexsab-ru/scripts";

// Класс валидации формы.
// Отвечает за:
// 1) Определение невалидных обязательных полей.
// 2) Формирование сообщений об ошибках для встроенной HTML5-валидации.
// 3) Показ/скрытие ошибок и скролл к первому ошибочному полю.
export default class FormsValidation {
    constructor(form) {
        this.form = form;
        // Карта преобразования флагов ValidityState -> человеческие сообщения.
        // Важно: сообщения короткие и понятные. Для customError берём текст из setCustomValidity.
        this.errors = {
            valueMissing: ({ title }) => title || 'Пожалуйста, заполните это поле',
            patternMismatch: ({ title }) => title || 'Данные не соответствуют формату',
            tooShort: ({ minLength }) => `Слишком короткое значение, минимум символов — ${minLength}`,
            tooLong: ({ maxLength }) => `Слишком длинное значение, ограничение символов — ${maxLength}`,
            // Покрытие кастомных ошибок (например, телефон):
            customError: ({ validationMessage }) => validationMessage || 'Проверьте корректность введённых данных',
        };
        this.isValid = true;
    }

    validate() {
        this.isValid = true;

        const requiredControlElements = [...this.form.elements].filter((element) => {
            // Пропускаем отключённые, fieldset, скрытые и необязательные поля
            if (
                element.disabled ||
                element.type === 'fieldset' ||
                element.type === 'hidden' ||
                !element.required ||
                (element.offsetParent === null && element.type !== 'radio' && element.type !== 'checkbox') // скрытые (display: none), кроме radio/checkbox (их может не быть в DOM)
            ) return false;

            // Для radio-групп: считаем невалидной только группу, где ни один не выбран
            // (фильтруем только первый инпут в группе, чтобы не дублировать ошибки)
            if (element.type === 'radio') {
                const group = this.form.querySelectorAll(`input[type="radio"][name="${element.name}"]`);
                if (element !== group[0]) return false; // только один раз на группу
                return [...group].every(radio => !radio.checked);
            }

            // Для чекбокса: обязательный и не отмечен — невалидно
            if (element.type === 'checkbox') {
                return !element.checked;
            }

            // Остальные контролы: если required и пусто — невалидно
            if (!element.value.trim()) return true;

            // minLength/maxLength: проверяем только если поле не пустое
            if (
                typeof element.minLength === 'number' && element.minLength > 0 &&
                element.value.trim().length < element.minLength
            ) {
                return true;
            }
            if (
                typeof element.maxLength === 'number' && element.maxLength > 0 &&
                element.value.trim().length > element.maxLength
            ) {
                return true;
            }
            // Телефон: используем внешнюю проверку и выставляем customValidity,
            // чтобы корректно отобразить сообщение об ошибке через HTML5-валидацию.
            if (element.type === 'tel') {
                // Всегда сбрасываем предыдущую кастомную ошибку перед новой проверкой
                element.setCustomValidity('');

                // Проверяем только непустое поле (пустоту покрывает valueMissing выше)
                if (element.value.trim()) {
                    // phoneChecker из @alexsab-ru/scripts: ожидает input-элемент и возвращает boolean
                    // true — номер валиден, false — невалиден. Внутри может происходить нормализация.
                    const isPhoneValid = phoneChecker(element, { silent: true });
                    if (!isPhoneValid) {
                        // Включаем customError для стандартного цикла обработки ошибок ниже
                        element.setCustomValidity('Укажите номер телефона в формате +7 999 999-99-99');
                        return true;
                    }
                }
            }
        });


        requiredControlElements.forEach((element, idx) => {
            // Состояние валидности HTML5 для элемента (включая наш customError)
            const elementValidityErrors = element.validity;

            const errorMessages = [];

            // Собираем сообщения для всех истинных флагов валидности
            Object.entries(this.errors).forEach(([errorType, getErrorMessage]) => {
                if (elementValidityErrors[errorType]) {
                    errorMessages.push(getErrorMessage(element));
                }
            });

            if (errorMessages.length) {
                this.isValid = false;
                const errorMessage = errorMessages[0];
                // Для radio/checkbox ищем ошибку в форме (они могут быть вложены в label)
                // Для остальных полей ищем в parentElement (как раньше)
                const errorField = (element.type === 'radio' || element.type === 'checkbox')
                    ? this.form.querySelector(`.error-message.${element.name}`)
                    : element.parentElement.querySelector(`.error-message.${element.name}`);
                if (errorField) {
                    errorField.innerText = errorMessage;
                    errorField.classList.remove('hidden');
                    // Определяем тип события в зависимости от типа поля
                    // radio и checkbox используют 'change', остальные — 'input'
                    const eventType = (element.type === 'radio' || element.type === 'checkbox') ? 'change' : 'input';
                    
                    // Для radio-групп добавляем обработчик на все элементы группы
                    if (element.type === 'radio') {
                        const group = this.form.querySelectorAll(`input[type="radio"][name="${element.name}"]`);
                        // Снимаем предыдущие обработчики со всех элементов группы
                        if (errorField._radioHandlers) {
                            group.forEach((radio, idx) => {
                                radio.removeEventListener(eventType, errorField._radioHandlers[idx]);
                            });
                        }
                        // Создаем новый обработчик для скрытия сообщения об ошибке
                        const handler = () => {
                            errorField.classList.add('hidden');
                            // Удаляем обработчики со всех radio в группе
                            group.forEach((radio, idx) => {
                                radio.removeEventListener(eventType, errorField._radioHandlers[idx]);
                            });
                            errorField._radioHandlers = null;
                        };
                        // Сохраняем ссылки на обработчики для каждого radio
                        errorField._radioHandlers = [];
                        group.forEach((radio) => {
                            radio.addEventListener(eventType, handler);
                            errorField._radioHandlers.push(handler);
                        });
                    } else {
                        // Для остальных полей (не radio) стандартная обработка
                        // Снимаем предыдущий обработчик, если был
                        errorField._inputHandler && element.removeEventListener(eventType, errorField._inputHandler);
                        // Добавляем новый обработчик: при изменении/вводе скрываем сообщение
                        const handler = () => {
                            errorField.classList.add('hidden');
                            element.removeEventListener(eventType, handler);
                            errorField._inputHandler = null;
                        };
                        element.addEventListener(eventType, handler);
                        errorField._inputHandler = handler;
                    }
                }
                // Скроллим только к первому невалидному полю
                if (idx === 0) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });
    }
}