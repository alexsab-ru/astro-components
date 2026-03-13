// ──────────────── Компонент индикатора печати ────────────────

/**
 * Компонент индикатора печати бота
 * Отображает анимированные точки, показывающие, что бот печатает сообщение
 */
export function Typing() {
  return (
    <div className="flex justify-start">
      <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full animate-bounce bg-accent-500"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full animate-bounce bg-accent-500"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full animate-bounce bg-accent-500"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}
