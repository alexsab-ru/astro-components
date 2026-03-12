// ──────────────── Компонент списка опций ────────────────

import { motion } from "motion/react";
import type { AnswerOption } from "../types";

interface OptionsListProps {
  options: AnswerOption[];
  currentStep: string;
  onSelect: (value: string) => void;
  onHide: () => void;
}

/**
 * Компонент для отображения списка опций выбора
 * Поддерживает два режима:
 * - Карточки с изображениями для шага выбора модели
 * - Кнопки для остальных шагов
 * 
 * @param options - массив опций для отображения
 * @param currentStep - текущий шаг (для определения стиля отображения)
 * @param onSelect - функция обработки выбора опции
 * @param onHide - функция для скрытия опций после выбора
 */
export function OptionsList({
  options,
  currentStep,
  onSelect,
  onHide,
}: OptionsListProps) {
  const handleSelect = (value: string) => {
    onHide();
    onSelect(value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`pt-1 ${
        currentStep === "model"
          ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
          : "flex flex-wrap gap-2"
      }`}
    >
      {options.map((opt) => {
        // Карточки с изображениями для шага выбора модели
        if (opt.image && currentStep === "model") {
          return (
            <motion.button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className="flex flex-col bg-white border-2 rounded-md sm:rounded-xl overflow-hidden hover:shadow-lg hover:border-accent-500 transition-all cursor-pointer group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="aspect-video w-full overflow-hidden bg-gray-100 flex items-center justify-center p-1">
                <img
                  src={opt.image}
                  alt={opt.label}
                  className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-2 sm:p-3 text-center">
                <div className="font-semibold text-xs sm:text-sm text-accent-500">
                  {opt.label}
                </div>
                {opt.description && (
                  <div className="text-gray-500 mt-0.5 text-[10px] sm:text-xs">
                    {opt.description}
                  </div>
                )}
              </div>
            </motion.button>
          );
        }

        // Обычные кнопки для остальных шагов
        return (
          <button
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            className="bg-white px-4 py-2 rounded-full hover:shadow-md transition-all cursor-pointer shadow-sm text-xs sm:text-sm font-medium border border-accent-500 text-accent-500"
          >
            {opt.label}
          </button>
        );
      })}
    </motion.div>
  );
}
