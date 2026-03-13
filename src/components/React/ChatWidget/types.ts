// ──────────────── Types для ChatWidget ────────────────

/**
 * Тип сообщения в чате
 */
export interface ChatMessage {
  id: string;
  type: "bot" | "user" | "error";
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
 * Вопрос квиза
 */
export interface QuizQuestion {
  id: string;
  type: "radio" | "checkbox";
  title: string;
  answerOptions: (string | AnswerOption)[];
}

/**
 * Настройки чата из JSON
 */
export interface ChatSettings {
  managerName?: string;
  managerPosition?: string;
  managerPhoto?: string;
  formName?: string;
  brand?: string;
  dealer?: string;
  legalCityWhere?: string;
  messageDelayBase?: number;
  messageDelayPerChar?: number;
}

/**
 * Шаблоны сообщений чата из JSON
 */
export interface ChatMessages {
  greeting?: string;
  intro?: string;
  callToAction?: string;
  beforeName?: string;
  askName?: string;
  namePlaceholder?: string;
  afterName?: string;
  askPhone?: string;
  phonePlaceholder?: string;
  success?: string;
}

/**
 * Цвет модели из models.json
 */
export interface ModelColor {
  id: string;
  name: string;
}

/**
 * Данные модели для динамических опций (цвета и т.д.)
 */
export interface ModelData {
  name: string;
  colors?: ModelColor[];
}

/**
 * Конфигурация чата из chat-landing.json
 */
export interface ChatLandingConfig {
  settings?: ChatSettings;
  messages?: ChatMessages;
  questions: QuizQuestion[];
  models?: ModelData[];
}

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
  config: ChatLandingConfig;
}
