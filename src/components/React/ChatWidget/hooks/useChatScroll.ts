// ──────────────── Хук для автоскролла чата ────────────────

import { useRef, useCallback } from 'react';

/**
 * Хук для управления автоскроллом контейнера с сообщениями
 * Автоматически прокручивает контейнер вниз при изменении сообщений или опций
 * 
 * @returns объект с ref для контейнера и функцией для ручной прокрутки
 */
export function useChatScroll() {
  const scrollRef = useRef<HTMLDivElement>(null);

  /**
   * Прокручивает контейнер вниз с небольшой задержкой
   * для корректной работы с анимациями
   */
  const scroll = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 80);
  }, []);

  return {
    scrollRef,
    scroll,
  };
}
