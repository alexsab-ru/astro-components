// ──────────────── Хук для управления шагами чата ────────────────
//
// Обычный поток: intro → вопросы → name → phone → отправка лида (useInputHandler).
// Успех после телефона НЕ через шаг done: isFinished + SuccessMessage (ChatWidget-v2).
// Шаг done только при пустом конфиге (квиз недоступен).

import { useState, useMemo } from 'react';
import type {
  ChatLandingConfig,
  StepConfig,
  QuizQuestion,
  AnswerOption,
  ModelData
} from '../types';
import { interpolateChatTemplate } from '../utils';

/** id шага «офлайн» — единственный сценарий, где используется done */
export const CHAT_OFFLINE_STEP_ID = 'done';

/**
 * Собирает уникальные цвета выбранных моделей + кнопку "Ещё не определился"
 * Поддерживает множественный выбор (id моделей через запятую)
 */
function getColorOptions(modelAnswer: string | undefined, models: ModelData[]): AnswerOption[] {
  if (!modelAnswer) return [{ label: 'Ещё выбираю', value: 'Ещё выбираю' }];

  const selectedIds = modelAnswer.split(',').map(s => s.trim());
  const seen = new Set<string>();
  const options: AnswerOption[] = [];

  for (const modelId of selectedIds) {
    const model = models.find(m => m.id === modelId);
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
    const isOnline = Array.isArray(questions) && questions.length > 0;
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

    // ───── конфиг без вопросов: один шаг done, без лида ─────
    if (!isOnline) {
      map.intro = {
        botMessages: [],
        nextStep: () => CHAT_OFFLINE_STEP_ID,
      };
      map[CHAT_OFFLINE_STEP_ID] = {
        botMessages: [
          'Временно недоступно, оставьте сообщение через кнопку "Заказать звонок" в верху страницы',
        ],
        nextStep: () => CHAT_OFFLINE_STEP_ID,
      };
      return map;
    }

    // ───── введение ─────
    const introMessages: string[] = [];
    if (messages.greeting) introMessages.push(interpolateChatTemplate(messages.greeting, vars));
    if (messages.intro) introMessages.push(interpolateChatTemplate(messages.intro, vars));
    if (messages.callToAction) introMessages.push(interpolateChatTemplate(messages.callToAction, vars));

    map.intro = {
      botMessages: introMessages,
      nextStep: () => questions[0].id,
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

      // Пустой title — шаг без реплики бота (см. silentBridge в chat-landing.json)
      map[q.id] = {
        botMessages: q.title?.trim() ? [q.title] : [],
        options,
        multiple: q.type === "checkbox",
        nextStep: () => next,
      };
    });

    // ───── шаг ввода имени ─────
    const nameMessages: string[] = [];
    if (messages.beforeName) nameMessages.push(interpolateChatTemplate(messages.beforeName, vars));
    if (messages.askName) nameMessages.push(interpolateChatTemplate(messages.askName, vars));

    map.name = {
      botMessages: nameMessages,
      inputField: {
        placeholder: messages.namePlaceholder || "Введите ваше имя",
        type: "text",
        name: "name"
      },
      nextStep: () => "phone",
    };

    // ───── телефон — последний шаг квиза; лид уходит из useInputHandler ─────
    // messages.success показывается через isFinished (см. useFormSubmission)
    map.phone = {
      botMessages: [],
      inputField: {
        placeholder: messages.phonePlaceholder || "+7 (___) ___-__-__",
        type: "tel",
        name: "phone"
      },
      nextStep: () => "phone",
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
