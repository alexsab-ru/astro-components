// ──────────────── Хук для управления шагами чата ────────────────

import { useState, useMemo } from 'react';
import type {
  ChatLandingConfig,
  StepConfig,
  QuizQuestion,
  AnswerOption,
  ModelData
} from '../types';

/**
 * Подставляет переменные в шаблон строки
 */
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] || '');
}

/**
 * Собирает уникальные цвета выбранных моделей + кнопку "Ещё не определился"
 * Поддерживает множественный выбор (через запятую)
 */
function getColorOptions(modelAnswer: string | undefined, models: ModelData[]): AnswerOption[] {
  if (!modelAnswer) return [{ label: 'Ещё выбираю', value: 'Ещё выбираю' }];

  const selectedNames = modelAnswer.split(',').map(s => s.trim());
  const seen = new Set<string>();
  const options: AnswerOption[] = [];

  for (const name of selectedNames) {
    const model = models.find(m => m.name === name);
    if (!model?.colors) continue;
    for (const color of model.colors) {
      if (color.name && !seen.has(color.name)) {
        seen.add(color.name);
        options.push({ label: color.name, value: color.name });
      }
    }
  }

  options.push({ label: 'Ещё выбираю', value: 'Ещё выбираю' });
  return options;
}

export function useChatSteps(config: ChatLandingConfig) {
  const [currentStep, setCurrentStep] = useState("intro");
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showOptions, setShowOptions] = useState(false);

  const steps = useMemo(() => {
    const { settings = {}, messages = {}, questions } = config;
    const managerName = settings.managerName || 'Менеджер';
    const managerPosition = settings.managerPosition || '';
    const brand = settings.brand || 'БРЕНД';
    const dealer = settings.dealer || 'НАЗВАНИЕ ДИЛЕРА';
    const legalCityWhere = settings.legalCityWhere || 'Городе';

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

      // Динамические цвета: если id=color и answerOptions пуст — берём из выбранной модели
      let options: AnswerOption[];
      if (q.id === 'color' && q.answerOptions.length === 0 && config.models) {
        options = getColorOptions(answers.model, config.models);
      } else {
        options = q.answerOptions.map((opt): AnswerOption => {
          if (typeof opt === 'string') {
            return { label: opt, value: opt, image: '', description: '' };
          }
          return {
            label: opt.label || opt.value || '',
            value: opt.value || opt.label || '',
            image: opt.image || '',
            description: opt.description || '',
          };
        });
      }

      map[q.id] = {
        botMessages: [q.title],
        options,
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
