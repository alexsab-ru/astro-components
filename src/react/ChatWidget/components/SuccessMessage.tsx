// ──────────────── Компонент сообщения об успешной отправке ────────────────

import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";

interface SuccessMessageProps {
  /** Текст из messages.success (уже с подставленным {name}) */
  text: string;
}

/**
 * Сообщение после успешной отправки лида
 */
export function SuccessMessage({ text }: SuccessMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex justify-center pt-3"
    >
      <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-5 text-center max-w-md">
        <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
        <div className="text-green-800 text-sm font-semibold whitespace-pre-line">
          {text}
        </div>
      </div>
    </motion.div>
  );
}
