// ──────────────── Компонент сообщения в чате ────────────────

import { motion } from "motion/react";
import type { ChatMessage } from "../types";

interface MessageProps {
  message: ChatMessage;
}

/**
 * Компонент для отображения сообщения в чате
 * Поддерживает два типа сообщений: от пользователя и от бота
 * С разными стилями для каждого типа
 * 
 * @param message - объект сообщения с id, type и text
 */
export function Message({ message }: MessageProps) {
  return (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={`flex ${
        message.type === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <div
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
