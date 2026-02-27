// ──────────────── Хук для инициализации чата ────────────────

import { useRef, useEffect } from 'react';
import type { StepConfig } from '../types';

interface UseChatInitParams {
  steps: Record<string, StepConfig>;
  addBotMessages: (texts: string[], onDone?: () => void) => void;
  setCurrentStep: (step: string) => void;
  setShowOptions: (show: boolean) => void;
}

/**
 * Хук для инициализации чата при первом рендере
 * Показывает вступительные сообщения и переходит к первому шагу
 * 
 * @param params - параметры хука
 */
export function useChatInit({
  steps,
  addBotMessages,
  setCurrentStep,
  setShowOptions,
}: UseChatInitParams) {
  const hasInit = useRef(false);

  useEffect(() => {
    if (!hasInit.current && steps.intro) {
      hasInit.current = true;

      addBotMessages(steps.intro.botMessages, () => {
        const firstStep = steps.intro.nextStep();
        setCurrentStep(firstStep);

        addBotMessages(steps[firstStep]?.botMessages || [], () => {
          setShowOptions(true);
        });
      });
    }
  }, [steps, addBotMessages, setCurrentStep, setShowOptions]);
}
