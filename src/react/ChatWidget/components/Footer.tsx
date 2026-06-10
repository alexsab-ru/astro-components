// ──────────────── Компонент подвала чата ────────────────

interface FooterProps {
  dealer?: string;
}

/**
 * Компонент подвала чата
 * Отображает название дилера в нижней части виджета
 * 
 * @param dealer - название дилера (опционально)
 */
export function Footer({ dealer = '' }: FooterProps) {
  return (
    <div className="px-4 py-2.5 bg-white border-t border-gray-100 shrink-0 text-center text-gray-300 text-xs">
      {dealer}
    </div>
  );
}
