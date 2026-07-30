// ──────────────── Хук для отправки формы ────────────────
//
// Успешная отправка: setIsFinished(true) → SuccessMessage в ChatWidget-v2
// (messages.success из JSON). Шаг done в useChatSteps для этого не используется.

import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { getPair } from '@/js/utils/helpers';
import { getCalltouchGoalPayload } from '@/js/utils/calltouchLeadDecision';
import settings from '@/data/site/settings.json';

const { connectforms_link } = settings;

const SEND_MAIL_COOKIE = 'SEND_MAIL';

interface UseFormSubmissionParams {
  formName: string;
  ct_routeKey?: string;
  ct_mod_id?: string;
  ct_site_id?: string;
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
  ct_routeKey = '',
  ct_mod_id = '',
  ct_site_id = '',
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

    // Динамический импорт: модуль содержит browser-only код (window.*), SSR его не должен трогать
    const [
      { reachGoal, setCookie, deleteCookie },
      { appendCalltouchResultToFormData, attemptCalltouchCallback },
    ] = await Promise.all([
      import('@alexsab-ru/scripts'),
      import('@alexsab-ru/scripts/calltouch'),
    ]);

    // Отправляем цель «форма отправлена»
    reachGoal("form_submit");

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

    const calltouchResult = await attemptCalltouchCallback({
      routeKey: ct_routeKey,
      phone: data.phone || '',
      name: data.name || '',
      modId: ct_mod_id,
      siteId: ct_site_id,
    });
    const calltouchFields = new FormData();
    appendCalltouchResultToFormData(calltouchFields, calltouchResult);

    Object.keys(payload).forEach((key) => {
      if (/^ct_/i.test(key) || /^ctw_/i.test(key)) {
        delete payload[key];
      }
    });
    for (const [key, value] of calltouchFields.entries()) {
      payload[key] = value;
    }

    // Объект для аналитики (аналог getFormDataObject из @alexsab-ru/scripts).
    const formDataObj = {
      eventProperties: { ...payload, formID: formName },
      eventCategory: "Lead",
      sourceName: "page",
      ...(calltouchResult.siteId ? { siteId: calltouchResult.siteId } : {}),
    };

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
        // attention:true — сервер посчитал заявку подозрительной (антиспам).
        if (res.attention === true) {
          reachGoal("form_attention");
        } else {
          reachGoal(
            "form_success",
            getCalltouchGoalPayload(res, calltouchResult, formDataObj)
          );
        }
        // Ставим куку, как connectForms, чтобы не было повторных отправок
        setCookie(SEND_MAIL_COOKIE, true, { domain: window.location.hostname, path: '/', expires: 600 });
        setIsFinished(true);
      } else {
        const errorMsg = res?.error || "Ошибка на стороне сервера. Попробуйте еще раз.";
        reachGoal("form_error");
        deleteCookie(SEND_MAIL_COOKIE);
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
      reachGoal("form_error");
      deleteCookie(SEND_MAIL_COOKIE);
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
  }, [formName, ct_routeKey, ct_mod_id, ct_site_id, setIsTyping, setMessages, setCurrentStep, scroll]);

  return {
    isFinished,
    setIsFinished,
    sendLead,
    setInputValueRef, // Возвращаем ref для установки функции извне
  };
}
