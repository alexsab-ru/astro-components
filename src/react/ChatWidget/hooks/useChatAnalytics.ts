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

  const sendOnce = useCallback(
    (goal: string, params?: GoalParams) => {
      if (sentEvents.has(goal)) return;

      sentEvents.add(goal);
      sendChatGoal(goal, params);
    },
    [sentEvents],
  );

  // Legacy form_chat_start: intro and first question have been prepared;
  // useChatInit reveals answer options here. This does not check viewport visibility.
  // The first accepted visitor answer is already tracked by form_chat_step_1.
  const trackChatStart = useCallback(() => {
    const firstQuestion = questions[0];
    if (!firstQuestion) return;

    sendOnce('form_chat_start', {
      id: firstQuestion.id,
      title: firstQuestion.title,
    });
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
    trackChatStart,
    trackQuestionAnswer,
    trackNameFilled,
    trackPhoneShown,
  };
}
