// ──────────────── Хук для управления шагами чата ────────────────

import { useState, useMemo } from 'react';
import type { 
  QuizConfig, 
  StepConfig, 
  QuizIntro, 
  QuizQuestion, 
  QuizFinal,
  AnswerOption 
} from '../types';

interface UseChatStepsParams {
  config: QuizConfig;
  managerName: string;
  managerPosition: string;
  brand: string;
  dealer: string;
  legalCityWhere: string;
}

/**
 * Хук для управления шагами квиза
 * Строит карту шагов из конфигурации и управляет навигацией между ними
 * 
 * @param params - параметры для построения шагов
 * @returns объект с состоянием шагов и функциями для работы с ними
 */
export function useChatSteps({
  config,
  managerName,
  managerPosition,
  brand,
  dealer,
  legalCityWhere,
}: UseChatStepsParams) {
  const [currentStep, setCurrentStep] = useState("welcome");
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showOptions, setShowOptions] = useState(false);

  /**
   * Строит карту шагов из конфигурации квиза
   * Включает: введение, вопросы, ввод имени, ввод телефона, финал
   */
  const steps = useMemo(() => {
    const intro = config[0] as QuizIntro;
    const questions = config.filter((q) => "id" in q) as QuizQuestion[];
    const final = config[config.length - 1] as QuizFinal;

    const map: Record<string, StepConfig> = {};

    // Формируем вступительные сообщения бота
    const botIntroMessages = 
      Array.isArray(intro.title) ? intro.title : typeof intro.title === "string" ? [
        "Здравствуйте! 👋",
        `Меня зовут ${managerName}, ${managerPosition} официального дилера ${dealer} в ${legalCityWhere}!`,
        `Ответьте на несколько вопросов, и я смогу подобрать для Вас наиболее выгодное персональное предложение на новый ${brand}`,
        intro.title,
      ] : [];

    // ───── введение ─────
    map.intro = {
      botMessages: botIntroMessages,
      nextStep: () => questions[0]?.id || "done",
    };

    // ───── вопросы квиза ─────
    questions.forEach((q, index) => {
      const next =
        index === questions.length - 1
          ? "name"
          : questions[index + 1].id;

      map[q.id] = {
        botMessages: [q.title],
        options: q.answerOptions.map((opt) => {
          // Если опция - строка, преобразуем в объект AnswerOption
          if (typeof opt === 'string') {
            return {
              label: opt,
              value: opt,
              image: '',
              description: '',
            };
          }
          // Если опция - объект AnswerOption, используем его свойства
          return {
            label: opt.label || opt.value || '',
            value: opt.value || opt.label || '',
            image: opt.image || '',
            description: opt.description || '',
          };
        }),
        multiple: q.type === "checkbox",
        nextStep: () => next,
      };
    });

    // ───── шаг ввода имени ─────
    map.name = {
      botMessages: [
        "Отлично 👍",
        "Как я могу к вам обращаться?",
      ],
      inputField: {
        placeholder: "Введите ваше имя",
        type: "text",
        name: "name"
      },
      nextStep: () => "phone",
    };

    // ───── шаг ввода телефона ─────
    map.phone = {
      botMessages: [
        "Приятно познакомиться! 😊",
        final.title,
      ],
      inputField: {
        placeholder: "+7 (___) ___-__-__",
        type: "tel",
        name: "phone"
      },
      nextStep: () => "done",
    };

    // ───── финальный шаг ─────
    map.done = {
      botMessages: [
        `Спасибо, ${answers.name || ''}! Ваша заявка принята ✅`,
      ],
      nextStep: () => "done",
    };

    return map;
  }, [config, answers, managerName, managerPosition, brand, dealer, legalCityWhere]);

  return {
    currentStep,
    setCurrentStep,
    answers,
    setAnswers,
    showOptions,
    setShowOptions,
    steps,
  };
}
