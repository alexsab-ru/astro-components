// Нормализует идентификатор модели: убирает все не-буквенно-цифровые символы и приводит к нижнему регистру.
export const normalizeModelId = (str) => (str || '').toString().replace(/\W/gm, '').toLowerCase();
