// ──────────────── Компонент заголовка чата ────────────────

import { User } from "lucide-react";

interface HeaderProps {
  managerName: string;
  managerPhoto?: string;
  dealer: string;
  isOnline?: boolean;
}

/**
 * Компонент заголовка чата
 * Отображает информацию о менеджере, статус онлайн и название дилера
 * 
 * @param managerName - имя менеджера
 * @param managerPhoto - фото менеджера (опционально)
 * @param dealer - название дилера
 */
export function Header({ managerName, managerPhoto = '', dealer, isOnline = true }: HeaderProps) {
  return (
    <div className="text-white px-5 py-4 flex items-center gap-3 shrink-0 bg-linear-[var(--brand-gradient)]">
      {managerPhoto ? (
        <img
          src={managerPhoto}
          alt={managerName}
          className="size-10 object-cover object-center overflow-hidden rounded-full"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <User className="size-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-base font-heading">{managerName}</div>
        <div className={`flex items-center gap-1.5 text-xs ${!isOnline ? 'opacity-60' : ''}`}>
          <span className={`w-2 h-2 rounded-full inline-block ${isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
          {isOnline ? 'Онлайн' : 'Оффлайн'}
        </div>
      </div>
      <div className="px-3 py-1 rounded-full bg-white/15 hidden sm:block text-xs">
        {dealer}
      </div>
    </div>
  );
}
