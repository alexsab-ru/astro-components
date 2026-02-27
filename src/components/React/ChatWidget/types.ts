// ──────────────── Types для ChatWidget ────────────────

/**
 * Тип сообщения в чате
 */
export interface ChatMessage {
  id: string;
  type: "bot" | "user";
  text: string;
}

/**
 * Опция ответа в квизе
 */
export interface AnswerOption {
  label: string;
  value: string;
  image?: string;
  description?: string;
}

/**
 * Вводное сообщение квиза
 */
export interface QuizIntro {
  title: string | string[];
  description?: string;
  startButtonText?: string;
}

/**
 * Вопрос квиза
 */
export interface QuizQuestion {
  id: string;
  type: "radio" | "checkbox";
  title: string;
  answerOptions: (string | AnswerOption)[];
}

/**
 * Финальное сообщение квиза
 */
export interface QuizFinal {
  title: string;
  description?: string;
}

/**
 * Конфигурация квиза - массив из введения, вопросов и финала
 */
export type QuizConfig = Array<QuizIntro | QuizQuestion | QuizFinal>;

/**
 * Поле ввода для шага
 */
export interface InputFieldConfig {
  placeholder: string;
  type: string;
  name: string;
}

/**
 * Конфигурация шага чата
 */
export interface StepConfig {
  botMessages: string[];
  options?: AnswerOption[];
  inputField?: InputFieldConfig;
  multiple?: boolean;
  nextStep: () => string;
}

/**
 * Пропсы компонента ChatWidget
 */
export interface ChatWidgetProps {
  config: QuizConfig;
  managerName?: string;
  managerPosition?: string;
  brand?: string;
  dealer?: string;
  legalCityWhere?: string;
  formName?: string;
}
