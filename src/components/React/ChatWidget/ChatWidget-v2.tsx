import { useEffect, useRef, useCallback } from "react";
import {
  Header,
  Message,
  Typing,
  OptionsList,
  SuccessMessage,
  InputField,
} from "./components";

import type { ChatWidgetProps } from "./types";

import { useChatScroll } from './hooks/useChatScroll';
import { useChatMessages } from './hooks/useChatMessages';
import { useChatSteps } from './hooks/useChatSteps';
import { useFormSubmission } from './hooks/useFormSubmission';
import { useAnswerHandler } from './hooks/useAnswerHandler';
import { useInputHandler } from './hooks/useInputHandler';
import { useChatInit } from './hooks/useChatInit';

// ──────────────── component ────────────────

export function ChatWidget({ config }: ChatWidgetProps) {
  const settings = config.settings || {};
  const managerName = settings.managerName || 'Менеджер';
  const formName = settings.formName || 'Квиз чат';
  const dealer = settings.dealer || 'Официальный дилер';

  // Автоскролл: отключён до первого ответа пользователя
  const scrollEnabled = useRef(false);
  const { scrollRef, scroll } = useChatScroll();

  const scrollIfEnabled = useCallback(() => {
    if (scrollEnabled.current) scroll();
  }, [scroll]);

  const enableScroll = useCallback(() => {
    scrollEnabled.current = true;
  }, []);

  const {
    currentStep,
    setCurrentStep,
    answers,
    setAnswers,
    showOptions,
    setShowOptions,
    steps,
  } = useChatSteps(config);

  const {
    messages,
    setMessages,
    isTyping,
    setIsTyping,
    addUserMessage,
    addBotMessage,
    addErrorMessage,
    addBotMessages,
  } = useChatMessages({
    scroll: scrollIfEnabled,
    setShowOptions,
    messageDelayBase: settings.messageDelayBase,
    messageDelayPerChar: settings.messageDelayPerChar,
  });

  const {
    isFinished,
    sendLead,
    setInputValueRef,
  } = useFormSubmission({
    formName,
    setIsTyping,
    setMessages,
    setCurrentStep,
    scroll: scrollIfEnabled,
  });

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
    onFirstAnswer: enableScroll,
  });

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
    addErrorMessage,
    sendLead,
    handleAnswer,
  });

  setInputValueRef.current = setInputValue;

  useChatInit({
    steps,
    addBotMessages,
    setCurrentStep,
    setShowOptions,
  });

  useEffect(() => {
    scrollIfEnabled();
  }, [messages, showOptions, scrollIfEnabled]);

  const cfg = steps[currentStep];

  return (
    <div className="w-full max-w-5xl 2xl:max-w-7xl mx-auto px-0 md:px-5">
      <div className="flex flex-col rounded-xl md:rounded-2xl overflow-hidden border shadow-xl min-h-[500px] h-[70vh]">
        <Header managerName={managerName} managerPhoto={settings.managerPhoto} dealer={dealer} />

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
      </div>
    </div>
  );
}
