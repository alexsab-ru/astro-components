// ──────────────── Компонент сообщения в чате ────────────────

import { motion } from "motion/react";
import { useEffect, useRef, useState } from 'react';
import { observeMessageVisibility } from '../messageVisibility.js';
import type { ChatMessage } from "../types";

interface MessageProps {
  message: ChatMessage;
  onVisible?: () => void;
}

/**
 * Компонент для отображения сообщения в чате
 * Поддерживает два типа сообщений: от пользователя и от бота
 * С разными стилями для каждого типа
 * 
 * @param message - объект сообщения с id, type и text
 */
export function Message({ message, onVisible }: MessageProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    if (
      !animationComplete ||
      message.type !== 'bot' ||
      !message.text.trim() ||
      !onVisible ||
      !bubbleRef.current
    ) return;
    return observeMessageVisibility(bubbleRef.current, onVisible);
  }, [animationComplete, message.type, message.text, onVisible]);

  return (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      onAnimationComplete={() => setAnimationComplete(true)}
      className={`flex ${
        message.type === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <div
        ref={bubbleRef}
        data-chat-bot-message={message.type === 'bot' ? '' : undefined}
        className={`max-w-[80%] px-4 py-2.5 text-xs sm:text-sm shadow-sm rounded-2xl ${
          message.type === "user"
            ? "text-white rounded-br-md bg-accent-500"
            : message.type === "error"
              ? "text-red-800 rounded-bl-md border border-red-200 bg-red-50"
              : "bg-white text-black rounded-bl-md border"
        }`}
        dangerouslySetInnerHTML={{ __html: message.text }}
      />
    </motion.div>
  );
}
