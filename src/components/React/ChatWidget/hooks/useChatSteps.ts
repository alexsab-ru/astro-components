// ──────────────── Хук для управления шагами чата ────────────────

import { useState, useMemo } from 'react';
import type {
  ChatLandingConfig,
  StepConfig,
  QuizQuestion,
  AnswerOption
} from '../types';

/**
 * Подставляет переменные в шаблон строки
 */
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] || '');
}

export function useChatSteps(config: ChatLandingConfig) {
  const [currentStep, setCurrentStep] = useState("intro");
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showOptions, setShowOptions] = useState(false);

  const steps = useMemo(() => {
    const { settings = {}, messages = {}, questions } = config;
    const managerName = settings.managerName || 'Менеджер';
    const managerPosition = settings.managerPosition || '';
    const brand = settings.brand || 'CHERY';
    const dealer = settings.dealer || 'Официальный дилер';
    const legalCityWhere = settings.legalCityWhere || 'Самаре';

    const vars: Record<string, string> = {
      managerName,
      managerPosition,
      brand,
      dealer,
      legalCityWhere,
      name: answers.name || '',
    };

    const map: Record<string, StepConfig> = {};

    // ───── введение ─────
    const introMessages: string[] = [];
    if (messages.greeting) introMessages.push(interpolate(messages.greeting, vars));
    if (messages.intro) introMessages.push(interpolate(messages.intro, vars));
    if (messages.callToAction) introMessages.push(interpolate(messages.callToAction, vars));

    map.intro = {
      botMessages: introMessages,
      nextStep: () => questions[0]?.id || "done",
    };

    // ───── вопросы квиза ─────
    questions.forEach((q: QuizQuestion, index: number) => {
      const next =
        index === questions.length - 1
          ? "name"
          : questions[index + 1].id;

      map[q.id] = {
        botMessages: [q.title],
        options: q.answerOptions.map((opt): AnswerOption => {
          if (typeof opt === 'string') {
            return { label: opt, value: opt, image: '', description: '' };
          }
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
    const nameMessages: string[] = [];
    if (messages.beforeName) nameMessages.push(interpolate(messages.beforeName, vars));
    if (messages.askName) nameMessages.push(interpolate(messages.askName, vars));

    map.name = {
      botMessages: nameMessages,
      inputField: {
        placeholder: messages.namePlaceholder || "Введите ваше имя",
        type: "text",
        name: "name"
      },
      nextStep: () => "phone",
    };

    // ───── шаг ввода телефона ─────
    // botMessages пустой — персонализированные сообщения формируются в useAnswerHandler
    map.phone = {
      botMessages: [],
      inputField: {
        placeholder: messages.phonePlaceholder || "+7 (___) ___-__-__",
        type: "tel",
        name: "phone"
      },
      nextStep: () => "done",
    };

    // ───── финальный шаг ─────
    map.done = {
      botMessages: [
        interpolate(messages.success || "Спасибо, {name}! Ваша заявка принята ✅", vars),
      ],
      nextStep: () => "done",
    };

    return map;
  }, [config, answers]);

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
