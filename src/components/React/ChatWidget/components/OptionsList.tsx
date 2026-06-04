// ──────────────── Компонент списка опций ────────────────

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import type { AnswerOption } from "../types";

interface OptionsListProps {
  options: AnswerOption[];
  currentStep: string;
  /** radio — один клик и переход; checkbox — несколько вариантов + «Продолжить» */
  multiple?: boolean;
  onSelect: (value: string, displayText?: string) => void;
  onHide: () => void;
}

/**
 * Список опций квиза: карточки моделей или кнопки.
 * В режиме checkbox опции не скрываются до нажатия «Продолжить».
 */
export function OptionsList({
  options,
  currentStep,
  multiple = false,
  onSelect,
  onHide,
}: OptionsListProps) {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  // Сброс выбора при смене шага или набора опций
  useEffect(() => {
    setSelectedValues([]);
  }, [currentStep, options]);

  const finishSingle = (value: string, displayText?: string) => {
    onHide();
    onSelect(value, displayText);
  };

  const toggleCheckbox = (value: string) => {
    setSelectedValues((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value],
    );
  };

  const confirmMultiple = () => {
    if (!selectedValues.length) return;
    const labels = options
      .filter((o) => selectedValues.includes(o.value))
      .map((o) => o.label);
    onHide();
    onSelect(selectedValues.join(","), labels.join(", "));
  };

  const isModelCards = currentStep === "model";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="pt-1"
    >
      <div
        className={
          isModelCards
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
            : "flex flex-wrap gap-2"
        }
      >
        {options.map((opt) => {
          const isSelected = multiple && selectedValues.includes(opt.value);

          if (opt.image && isModelCards) {
            return (
              <motion.button
                key={opt.value}
                type="button"
                onClick={() => finishSingle(opt.value, opt.label)}
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

          if (multiple) {
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleCheckbox(opt.value)}
                className={`px-4 py-2 rounded-full transition-all cursor-pointer shadow-sm text-xs sm:text-sm font-medium border ${
                  isSelected
                    ? "bg-accent-500 text-white border-accent-500"
                    : "bg-white text-accent-500 border-accent-500 hover:shadow-md"
                }`}
              >
                {opt.label}
              </button>
            );
          }

          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => finishSingle(opt.value, opt.label)}
              className="bg-white px-4 py-2 rounded-full hover:shadow-md transition-all cursor-pointer shadow-sm text-xs sm:text-sm font-medium border border-accent-500 text-accent-500"
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {multiple && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            disabled={!selectedValues.length}
            onClick={confirmMultiple}
            className="bg-accent-500 text-white px-5 py-2 rounded-full text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md transition-all"
          >
            Продолжить
          </button>
        </div>
      )}
    </motion.div>
  );
}
