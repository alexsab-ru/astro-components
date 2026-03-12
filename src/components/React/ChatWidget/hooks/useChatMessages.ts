// ──────────────── Хук для управления сообщениями чата ────────────────

import { useState, useCallback, useRef } from 'react';
import type { ChatMessage } from '../types';

/**
 * Хук для управления сообщениями в чате
 * Включает добавление сообщений бота с анимацией печати и сообщений пользователя
 * 
 * @param scroll - функция для прокрутки контейнера после добавления сообщения
 * @param setShowOptions - функция для управления видимостью опций
 * @returns объект с состоянием и функциями для работы с сообщениями
 */
export function useChatMessages(
  scroll: () => void,
  setShowOptions: (value: boolean) => void
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const idCounter = useRef(0);
  const nextId = (prefix: string) => `${prefix}-${Date.now()}-${++idCounter.current}`;

  /**
   * Добавляет сообщение пользователя в чат
   * 
   * @param text - текст сообщения пользователя
   */
  const addUserMessage = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: nextId("user"), type: "user", text },
    ]);
    scroll();
  }, [scroll]);

  /**
   * Добавляет сообщение бота в чат
   * 
   * @param text - текст сообщения бота
   */
  const addBotMessage = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: nextId("bot"), type: "bot", text },
    ]);
    scroll();
  }, [scroll]);

  /**
   * Добавляет несколько сообщений бота последовательно с анимацией печати
   * Каждое сообщение появляется с задержкой, зависящей от длины текста
   * 
   * @param texts - массив текстов сообщений бота
   * @param onDone - функция обратного вызова, вызываемая после добавления всех сообщений
   */
  const addBotMessages = useCallback(
    (texts: string[], onDone?: () => void) => {
      setIsTyping(true);
      setShowOptions(false);
      let i = 0;

      const next = () => {
        if (i >= texts.length) {
          setIsTyping(false);
          onDone?.();
          return;
        }

        const text = texts[i];
        i++;

        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            { id: nextId("bot"), type: "bot", text },
          ]);
          scroll();
          next();
        }, 500 + text.length * 6);
      };

      next();
    },
    [scroll, setShowOptions],
  );

  return {
    messages,
    setMessages,
    isTyping,
    setIsTyping,
    addUserMessage,
    addBotMessage,
    addBotMessages,
  };
}
