import { phoneChecker } from "@alexsab-ru/scripts";

export default class FormsValidation {
    constructor(form) {
        this.form = form;
        this.errors = {
            valueMissing: ({ title }) => title || 'Пожалуйста, заполните это поле',
            patternMismatch: ({ title }) => title || 'Данные не соответствуют формату',
            tooShort: ({ minLength }) => `Слишком короткое значение, минимум символов — ${minLength}`,
            tooLong: ({ maxLength }) => `Слишком длинное значение, ограничение символов — ${maxLength}`,
        };
        this.isValid = true;
        this.validate();
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

            // Для radio-групп: required только если ни один не выбран (только для первого в группе)
            if (element.type === 'radio') {
                const group = this.form.querySelectorAll(`input[type="radio"][name="${element.name}"]`);
                if (element !== group[0]) return false; // только один раз на группу
                return [...group].every(radio => !radio.checked);
            }

            // Для чекбокса: если обязательный и не отмечен — ошибка
            if (element.type === 'checkbox') {
                return !element.checked;
            }

            // Остальные: если required и пусто
            if (!element.value.trim()) return true;

            // minLength/maxLength только если поле не пустое
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
            // pattern для телефона, только если поле не пустое
            if (element.type === 'tel' && element.value.trim() && !phoneChecker(element)) {
                this.isValid = false;
                return true;
            }
        });        
        

        requiredControlElements.forEach((element, idx) => {
            const elementValidityErrors = element.validity;
            
            const errorMessages = [];

            Object.entries(this.errors).forEach(([errorType, getErrorMessage]) => {
                if (elementValidityErrors[errorType]) {
                    errorMessages.push(getErrorMessage(element));
                }
            });

            if (errorMessages.length) {
                this.isValid = false;
                const errorMessage = errorMessages[0];
                const errorField = element.parentElement.querySelector(`.error-message.${element.name}`);
                if (errorField) {
                    errorField.innerText = errorMessage;
                    errorField.classList.remove('hidden');
                    // Снимаем предыдущий обработчик, если был
                    errorField._inputHandler && element.removeEventListener('input', errorField._inputHandler);
                    // Добавляем новый обработчик
                    const handler = () => {
                        errorField.classList.add('hidden');
                        element.removeEventListener('input', handler);
                        errorField._inputHandler = null;
                    };
                    element.addEventListener('input', handler);
                    errorField._inputHandler = handler;
                }
                // Скроллим только к первому невалидному полю
                if (idx === 0) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });
    }
}