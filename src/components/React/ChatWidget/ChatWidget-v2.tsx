import { useEffect } from "react";
import {
  Header,
  Footer,
  Message,
  Typing,
  OptionsList,
  SuccessMessage,
  InputField,
} from "./components";

import type { ChatWidgetProps } from "./types";

// Импортируем хуки
import { useChatScroll } from './hooks/useChatScroll';
import { useChatMessages } from './hooks/useChatMessages';
import { useChatSteps } from './hooks/useChatSteps';
import { useFormSubmission } from './hooks/useFormSubmission';
import { useAnswerHandler } from './hooks/useAnswerHandler';
import { useInputHandler } from './hooks/useInputHandler';
import { useChatInit } from './hooks/useChatInit';

// ──────────────── component ────────────────

export function ChatWidget({
  config,
  managerName = "Алексей",
  managerPosition = "руководитель отдела продаж",
  brand = "CHERY",
  dealer = "Официальный дилер",
  legalCityWhere = 'Самаре',
  formName = 'Квиз чат'
}: ChatWidgetProps) {
  // Хук для автоскролла
  const { scrollRef, scroll } = useChatScroll();

  // Хук для управления шагами
  const {
    currentStep,
    setCurrentStep,
    answers,
    setAnswers,
    showOptions,
    setShowOptions,
    steps,
  } = useChatSteps({
    config,
    managerName,
    managerPosition,
    brand,
    dealer,
    legalCityWhere,
  });

  // Хук для управления сообщениями
  const {
    messages,
    setMessages,
    isTyping,
    setIsTyping,
    addUserMessage,
    addBotMessage,
    addBotMessages,
  } = useChatMessages(scroll, setShowOptions);

  // Хук для отправки формы
  const {
    isFinished,
    setIsFinished,
    sendLead,
    setInputValueRef,
  } = useFormSubmission({
    formName,
    setIsTyping,
    setMessages,
    setCurrentStep,
    scroll,
  });

  // Хук для обработки ответов пользователя
  const { handleAnswer } = useAnswerHandler({
    currentStep,
    steps,
    answers,
    setAnswers,
    setCurrentStep,
    setShowOptions,
    addUserMessage,
    addBotMessages,
    config,
  });

  // Хук для обработки ввода данных
  const {
    inputValue,
    setInputValue,
    consentChecked,
    setConsentChecked,
    agreeError,
    setAgreeError,
    handleInputSubmit,
  } = useInputHandler({
    currentStep,
    answers,
    setAnswers,
    addUserMessage,
    addBotMessage,
    sendLead,
    handleAnswer,
  });

  // Устанавливаем setInputValue в ref для useFormSubmission
  setInputValueRef.current = setInputValue;

  // Инициализация чата
  useChatInit({
    steps,
    addBotMessages,
    setCurrentStep,
    setShowOptions,
  });

  // Автоскролл при изменении сообщений или опций
  useEffect(() => {
    scroll();
  }, [messages, showOptions, scroll]);

  const cfg = steps[currentStep];

  // ──────────────── UI (ПОЛНОСТЬЮ СОХРАНЕН) ────────────────

  return (
    <div className="w-full max-w-5xl 2xl:max-w-7xl mx-auto px-0 md:px-5">
      <div className="flex flex-col rounded-xl md:rounded-2xl overflow-hidden border shadow-xl min-h-[500px] h-[70vh]">
        <Header managerName={managerName} dealer={dealer} />

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-3 bg-gray-50"
          id="chat"
        >
          {messages.map((msg) => (
            <Message message={msg} key={msg.id} />
          ))}

          {isTyping && <Typing />}

          {showOptions && !isTyping && cfg?.options && (
            <OptionsList
              options={cfg.options}
              currentStep={currentStep}
              onSelect={handleAnswer}
              onHide={() => setShowOptions(false)}
            />
          )}

          {isFinished && !isTyping && <SuccessMessage />}
        </div>

        {/* Input area */}
        {showOptions && !isTyping && cfg?.inputField && !isFinished && (
          <InputField
            inputField={cfg.inputField}
            currentStep={currentStep}
            inputValue={inputValue}
            setInputValue={setInputValue}
            consentChecked={consentChecked}
            setConsentChecked={setConsentChecked}
            agreeError={agreeError}
            setAgreeError={setAgreeError}
            isTyping={isTyping}
            onSubmit={handleInputSubmit}
          />
        )}
        
        {/* <Footer dealer={dealer} /> */}
      </div>
    </div>
  );
}