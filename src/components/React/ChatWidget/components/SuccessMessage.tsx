// ──────────────── Компонент сообщения об успешной отправке ────────────────

import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";

/**
 * Компонент для отображения сообщения об успешной отправке формы
 * Показывается после успешной отправки данных на сервер
 */
export function SuccessMessage() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex justify-center pt-3"
    >
      <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-5 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
        <div className="text-green-800 text-sm font-semibold">
          Заявка отправлена!
        </div>
        <div className="text-green-600 mt-1 text-xs">
          Ожидайте звонка менеджера
        </div>
      </div>
    </motion.div>
  );
}
