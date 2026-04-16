import { motion } from "motion/react";
import { ShieldCheck, Percent, Truck, type LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  ShieldCheck,
  Percent,
  Truck,
};

export interface USPItem {
  icon: string;
  title: string;
  desc: string;
}

const DEFAULT_USPS: USPItem[] = [
  {
    icon: "ShieldCheck",
    title: "Гарантия",
    desc: "Официальная гарантия от производителя.",
  },
  {
    icon: "Percent",
    title: "Кредит от 0,1%",
    desc: "Специальные условия автокредитования. Одобрение за 15 минут.",
  },
  {
    icon: "Truck",
    title: "Трейд-ин с выгодой",
    desc: "Оценим ваш авто по максимальной стоимости. Обмен за 1 день.",
  },
];

interface Props {
  usps?: USPItem[];
}

export function USPSection({ usps = DEFAULT_USPS }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-10">
      {usps.map((u, i) => {
        const Icon = ICON_MAP[u.icon];
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.1, duration: 0.45 }}
            className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100"
          >
            <div
              className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white bg-accent-500"
            >
              {Icon && <Icon className="w-6 h-6" />}
            </div>
            <div className="min-w-0">
              <div className="text-gray-900" style={{ fontSize: 15, fontWeight: 600 }}>
                {u.title}
              </div>
              <div className="text-gray-500 mt-0.5" style={{ fontSize: 13, lineHeight: 1.45 }}>
                {u.desc}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
