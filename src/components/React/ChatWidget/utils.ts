// ──────────────── Утилиты для ChatWidget ────────────────

/**
 * Маскирует номер телефона в формат +7 XXX XXX-XX-XX
 * Удаляет все нецифровые символы, кроме начальных +7, 8 или 7
 * Форматирует номер с пробелами и дефисами
 * 
 * @param value - исходная строка с номером телефона
 * @returns отформатированный номер телефона
 */
export const maskPhone = (value: string): string => {
  // Удаляем начальные +7, 8 или 7, затем все нецифровые символы
  let num = value
    .replace(/^(\+7|8|7)/g, "")
    .replace(/\D/g, "")
    .split("");

  const i = num.length;

  // Форматируем номер с пробелами и дефисами
  if (i > 0) num.unshift("+7");
  if (i >= 1) num.splice(1, 0, " ");
  if (i >= 4) num.splice(5, 0, " ");
  if (i >= 7) num.splice(9, 0, "-");
  if (i >= 9) num.splice(12, 0, "-");

  return num.join("");
};
