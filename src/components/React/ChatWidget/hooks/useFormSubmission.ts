// ──────────────── Хук для отправки формы ────────────────

import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { getPair } from '@/js/utils/helpers';
import settings from '@/data/settings.json';

const { connectforms_link } = settings;

interface UseFormSubmissionParams {
  formName: string;
  setIsTyping: (value: boolean) => void;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  setCurrentStep: (step: string) => void;
  scroll: () => void;
}

/**
 * Хук для отправки данных формы на сервер
 * Обрабатывает успешную отправку и ошибки
 * 
 * @param params - параметры хука
 * @returns функция для отправки формы
 */
export function useFormSubmission({
  formName,
  setIsTyping,
  setMessages,
  setCurrentStep,
  scroll,
}: UseFormSubmissionParams) {
  const [isFinished, setIsFinished] = useState(false);
  // Используем ref для хранения функции setInputValue, которая будет установлена позже
  const setInputValueRef = useRef<((value: string) => void) | null>(null);

  /**
   * Отправляет данные формы на сервер
   * Добавляет дополнительные поля (form, agree, page_url, пары из getPair)
   * 
   * @param data - данные формы для отправки
   */
  const sendLead = useCallback(async (data: Record<string, any>) => {
    setIsTyping(true);

    // Создаём копию, чтобы не мутировать исходный объект (state)
    const payload: Record<string, any> = { ...data };

    // Получаем дополнительные пары ключ-значение
    const pairs = getPair();
    if (Object.keys(pairs).length > 0) {
      Object.entries(pairs).forEach(function(pair) {
        payload[pair[0]] = pair[1];
      });
    }

    // Добавляем обязательные поля формы
    payload.form = formName;
    payload.agree = 'on';
    payload.page_url = window.location.origin + window.location.pathname;

    if (window.location.hostname === "localhost") {
      console.log(payload);
    }

    const options = {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      credentials: "same-origin",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: payload,
      url: connectforms_link,
    };

    try {
      const response = await axios(options);
      
      if (window.location.hostname === "localhost") {
        console.log('Отправка письма', response);
      }

      const res = response.data;
      if (res?.answer && res.answer.toLowerCase() === 'ok') {
        setIsFinished(true);
      } else {
        const errorMsg = res?.error || "Ошибка на стороне сервера. Попробуйте еще раз.";
        setMessages(prev => [
          ...prev,
          {
            id: `bot-error-server-${Date.now()}`,
            type: "bot",
            text: `Упс 😔: ${errorMsg}. Попробуйте еще раз.`,
          }
        ]);
        setInputValueRef.current?.(data.phone);
        setCurrentStep('phone');
        setIsFinished(false);
      }
    } catch (error) {
      if (window.location.hostname === "localhost") {
        console.log('Ошибка отправки письма', error);
      }
      setMessages(prev => [
        ...prev,
        {
          id: `bot-error-${Date.now()}`,
          type: "bot",
          text: "Упс 😔 Ошибка соединения. Проверьте интернет и попробуйте еще раз.",
        }
      ]);
      setInputValueRef.current?.(data.phone);
      setCurrentStep('phone');
      setIsFinished(false);
    } finally {
      setIsTyping(false);
      scroll();
    }
  }, [formName, setIsTyping, setMessages, setCurrentStep, scroll]);

  return {
    isFinished,
    setIsFinished,
    sendLead,
    setInputValueRef, // Возвращаем ref для установки функции извне
  };
}
