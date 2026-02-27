// ──────────────── Хук для обработки ответов пользователя ────────────────

import { useCallback } from 'react';
import type { QuizConfig, StepConfig } from '../types';

interface UseAnswerHandlerParams {
  currentStep: string;
  steps: Record<string, StepConfig>;
  answers: Record<string, any>;
  setAnswers: (answers: Record<string, any>) => void;
  setCurrentStep: (step: string) => void;
  setShowOptions: (show: boolean) => void;
  addUserMessage: (text: string) => void;
  addBotMessages: (texts: string[], onDone?: () => void) => void;
  config: QuizConfig;
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

      // Сохраняем ответ пользователя
      if (currentStep !== "intro") {
        const updatedAnswers = {
          ...answers,
          [currentStep]: value,
        };
        setAnswers(updatedAnswers);
      }

      // Переходим к следующему шагу
      const nextKey = steps[currentStep].nextStep();
      setCurrentStep(nextKey);

      // Персонализация для шага ввода имени
      if (currentStep === "name") {
        const final = config[config.length - 1] as any;
        addBotMessages(
          [
            `${value}, приятно познакомиться! 😊`,
            final.title,
          ],
          () => setShowOptions(true),
        );
        return;
      }

      // Показываем сообщения следующего шага
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
    ],
  );

  return { handleAnswer };
}
