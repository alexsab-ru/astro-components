// ──────────────── Компонент поля ввода с чекбоксом согласия ────────────────

import { motion } from "motion/react";
import { Send } from "lucide-react";
import { AGREE_LABEL } from "@/const";
import { maskPhone } from "../utils";
import type { InputFieldConfig } from "../types";

interface InputFieldProps {
  inputField: InputFieldConfig;
  currentStep: string;
  inputValue: string;
  setInputValue: (value: string) => void;
  consentChecked: boolean;
  setConsentChecked: (checked: boolean) => void;
  agreeError: string | null;
  setAgreeError: (error: string | null) => void;
  isTyping: boolean;
  onSubmit: () => void;
}

/**
 * Компонент для ввода текстовых данных (имя, телефон)
 * Включает:
 * - Поле ввода с маской для телефона
 * - Чекбокс согласия для шага ввода телефона
 * - Кнопку отправки
 * 
 * @param inputField - конфигурация поля ввода
 * @param currentStep - текущий шаг (для определения типа поля)
 * @param inputValue - текущее значение поля
 * @param setInputValue - функция для обновления значения
 * @param consentChecked - состояние чекбокса согласия
 * @param setConsentChecked - функция для обновления чекбокса
 * @param agreeError - текст ошибки согласия
 * @param setAgreeError - функция для установки ошибки
 * @param isTyping - флаг состояния печати бота
 * @param onSubmit - функция обработки отправки формы
 */
export function InputField({
  inputField,
  currentStep,
  inputValue,
  setInputValue,
  consentChecked,
  setConsentChecked,
  agreeError,
  setAgreeError,
  isTyping,
  onSubmit,
}: InputFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentStep === "phone") {
      const masked = maskPhone(e.target.value);
      setInputValue(masked);
    } else {
      setInputValue(e.target.value);
    }
  };

  const handleConsentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setConsentChecked(checked);
    if (!checked) {
      setAgreeError("Чтобы продолжить, установите флажок");
    } else {
      setAgreeError(null);
    }
  };

  const handleFocus = () => {
    if (currentStep === "phone" && !inputValue) {
      setInputValue("+7 ");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 sm:px-5 py-3 bg-white border-t shrink-0"
    >
      {/* Чекбокс согласия для шага ввода телефона */}
      {currentStep === "phone" && (
        <label className="cursor-pointer block mb-4">
          <input
            type="checkbox"
            id="consent"
            name="agree"
            checked={consentChecked}
            onChange={handleConsentChange}
            className="sr-only"
          />
          <div className="text-black/80 text-xs sm:text-sm flex items-start">
            <span className="fake-checkbox-black mr-2"></span>
            <div>
              <div dangerouslySetInnerHTML={{ __html: AGREE_LABEL }}></div>
              {agreeError && (
                <div className="error-message mt-2 text-xs text-red-500">
                  {agreeError}
                </div>
              )}
            </div>
          </div>
        </label>
      )}

      {/* Поле ввода и кнопка отправки */}
      <div className="flex items-center gap-2">
        <input
          type={inputField.type}
          name={inputField.name}
          placeholder={inputField.placeholder}
          value={inputValue}
          onChange={handleChange}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          onFocus={handleFocus}
          className="flex-1 bg-gray-100 rounded-full px-3 sm:px-4 py-2.5 outline-none text-xs sm:text-sm"
        />
        <button
          onClick={onSubmit}
          disabled={isTyping}
          className="size-8 sm:size-10 rounded-full text-white flex items-center justify-center shrink-0 bg-accent-500"
        >
          <Send className="size-3 sm:size-4" />
        </button>
      </div>
    </motion.div>
  );
}
