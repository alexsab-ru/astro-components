import { useCallback, useState } from 'react';
import type { QuizQuestion } from '../types';
import { sendChatGoal } from '../utils';

type GoalParams = Record<string, string>;
const EMPTY_QUESTIONS: readonly QuizQuestion[] = [];

/**
 * Отправляет цели воронки чат-лендинга и защищает каждый этап от дублей.
 */
export function useChatAnalytics(
  questions: readonly QuizQuestion[] = EMPTY_QUESTIONS,
) {
  const [sentEvents] = useState(() => new Set<string>());
  const [hasChatStarted, setHasChatStarted] = useState(false);

  const sendOnce = useCallback(
    (goal: string, params?: GoalParams) => {
      if (sentEvents.has(goal)) return;

      sentEvents.add(goal);
      sendChatGoal(goal, params);
    },
    [sentEvents],
  );

  // form_chat_start: a rendered bot message was visible for 500 ms in an active
  // tab. The first accepted visitor answer remains form_chat_step_1.
  const trackChatStart = useCallback(() => {
    if (!questions.length) return;

    sendOnce('form_chat_start', {
      definition: 'bot_message_visible_v1',
      visibility: '50pct_500ms',
    });
    setHasChatStarted(true);
  }, [questions, sendOnce]);

  const trackQuestionAnswer = useCallback(
    (questionId: string, answer: string) => {
      const questionIndex = questions.findIndex(
        (question) => question.id === questionId,
      );
      if (questionIndex === -1) return;

      const question = questions[questionIndex];
      const goal = `form_chat_step_${questionIndex + 1}`;
      sendOnce(goal, {
        id: question.id,
        title: question.title,
        answer,
      });
    },
    [questions, sendOnce],
  );

  const trackNameFilled = useCallback(() => {
    sendOnce('form_chat_name_filled');
  }, [sendOnce]);

  const trackPhoneShown = useCallback(() => {
    sendOnce('form_chat_phone_shown');
  }, [sendOnce]);

  return {
    hasChatStarted,
    trackChatStart,
    trackQuestionAnswer,
    trackNameFilled,
    trackPhoneShown,
  };
}
