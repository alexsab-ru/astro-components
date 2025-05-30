const date = new Date();
const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
const month = date.getMonth() + 1;
const months = {
    1: { nominative: 'Январь', genitive: 'Января', prepositional: 'Январе' },
    2: { nominative: 'Февраль', genitive: 'Февраля', prepositional: 'Феврале' },
    3: { nominative: 'Март', genitive: 'Марта', prepositional: 'Марте' },
    4: { nominative: 'Апрель', genitive: 'Апреля', prepositional: 'Апреле' },
    5: { nominative: 'Май', genitive: 'Мая', prepositional: 'Мае' },
    6: { nominative: 'Июнь', genitive: 'Июня', prepositional: 'Июне' },
    7: { nominative: 'Июль', genitive: 'Июля', prepositional: 'Июле' },
    8: { nominative: 'Август', genitive: 'Августа', prepositional: 'Августе' },
    9: { nominative: 'Сентябрь', genitive: 'Сентября', prepositional: 'Сентябре' },
    10: { nominative: 'Октябрь', genitive: 'Октября', prepositional: 'Октябре' },
    11: { nominative: 'Ноябрь', genitive: 'Ноября', prepositional: 'Ноябре' },
    12: { nominative: 'Декабрь', genitive: 'Декабря', prepositional: 'Декабре' }
};
const lastDay = new Date(date.getFullYear(), month, 0);
const FIRST_DAY = firstDay.getDate() < 10 ? '0'+firstDay.getDate() : firstDay.getDate();
const LAST_DAY = lastDay.getDate();
const MONTH = month < 10 ? `0${month}` : month;
const MONTH_NOMINATIVE = months[month].nominative;
const MONTH_GENITIVE = months[month].genitive;
const MONTH_PREPOSITIONAL = months[month].prepositional;
const YEAR = date.getFullYear();

// Универсальный экспорт для поддержки как ES6, так и CommonJS
const dateUtils = {
    FIRST_DAY,
    LAST_DAY,
    MONTH,
    MONTH_NOMINATIVE,
    MONTH_GENITIVE,
    MONTH_PREPOSITIONAL,
    YEAR
};

// Поддержка ES6 модулей
export { FIRST_DAY, LAST_DAY, MONTH, MONTH_NOMINATIVE, MONTH_GENITIVE, MONTH_PREPOSITIONAL, YEAR };

// Поддержка CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = dateUtils;
}