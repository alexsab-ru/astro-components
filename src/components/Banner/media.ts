import type { TBanner } from "./types";

/**
 * Конвертирует значение позиции в Tailwind-класс object-position.
 * Поддерживает: 'top', 'center', 'bottom' и проценты: '70%', '40% 60%'.
 * Проценты преобразуются в Tailwind 4 формат: object-[X_Y].
 */
function toObjectClass(value: string, prefix = ''): string {
	const v = value.trim();

	if (/%/.test(v)) {
		const parts = v.split(/\s+/);
		const x = parts.length === 2 ? parts[0] : '50%';
		const y = parts.length === 2 ? parts[1] : parts[0];
		return `${prefix}object-[${x}_${y}]`;
	}

	const keyword = v === 'top' ? 'object-top' : v === 'bottom' ? 'object-bottom' : 'object-center';
	return `${prefix}${keyword}`;
}

export function getObjectPosition(banner?: TBanner): string {
	const mobileRaw  = banner?.position?.mobile  ?? banner?.imagePosition ?? 'center';
	const tabletRaw  = banner?.position?.tablet  ?? banner?.imagePosition ?? 'center';
	const desktopRaw = banner?.position?.desktop ?? banner?.imagePosition ?? 'center';

	const mobileClass  = toObjectClass(mobileRaw);
	const tabletClass  = toObjectClass(tabletRaw, 'md:');
	const desktopClass = toObjectClass(desktopRaw, 'lg:');

	return `${mobileClass} ${tabletClass} ${desktopClass}`;
}
