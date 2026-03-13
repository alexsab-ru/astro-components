// ──────────────── Хук для обработки ответов пользователя ────────────────

import { useCallback } from 'react';
import type { ChatLandingConfig, StepConfig } from '../types';

interface UseAnswerHandlerParams {
  currentStep: string;
  steps: Record<string, StepConfig>;
  answers: Record<string, any>;
  setAnswers: (answers: Record<string, any>) => void;
  setCurrentStep: (step: string) => void;
  setShowOptions: (show: boolean) => void;
  addUserMessage: (text: string) => void;
  addBotMessages: (texts: string[], onDone?: () => void) => void;
  config: ChatLandingConfig;
  onFirstAnswer?: () => void;
}

/**
 * Хук для обработки ответов пользователя
 * Управляет навигацией между шагами, сохранением ответов и показом сообщений бота
 * 
 * @param params - параметры хука
 * @returns функция для обработки ответа пользователя
 */
export function useAnswerHandler({
  currentStep,
  steps,
  answers,
  setAnswers,
  setCurrentStep,
  setShowOptions,
  addUserMessage,
  addBotMessages,
  config,
  onFirstAnswer,
}: UseAnswerHandlerParams) {
  /**
   * Обрабатывает ответ пользователя
   * Сохраняет ответ, переходит к следующему шагу и показывает соответствующие сообщения
   * 
   * @param value - значение ответа пользователя
   */
  const handleAnswer = useCallback(
    (value: string) => {
      // Добавляем сообщение пользователя
      addUserMessage(value);

      // Включаем автоскролл после первого ответа пользователя
      onFirstAnswer?.();

      if (currentStep !== "intro") {
        const updatedAnswers = {
          ...answers,
          [currentStep]: value,
        };
        setAnswers(updatedAnswers);
      }

      const nextKey = steps[currentStep].nextStep();
      setCurrentStep(nextKey);

      // Персонализация для шага ввода имени
      if (currentStep === "name") {
        const messages = config.messages || {};
        const afterName = (messages.afterName || "{name}, приятно познакомиться! 😊")
          .replace(/\{name\}/g, value);
        const askPhone = messages.askPhone || "Оставьте номер вашего телефона.";
        addBotMessages(
          [afterName, askPhone],
          () => setShowOptions(true),
        );
        return;
      }

      const nextCfg = steps[nextKey];
      if (nextCfg?.botMessages?.length) {
        addBotMessages(nextCfg.botMessages, () => {
          if (nextKey !== "done") setShowOptions(true);
        });
      }
    },
    [
      currentStep,
      steps,
      answers,
      setAnswers,
      setCurrentStep,
      setShowOptions,
      addUserMessage,
      addBotMessages,
      config,
      onFirstAnswer,
    ],
  );

  return { handleAnswer };
}