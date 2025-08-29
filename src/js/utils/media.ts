import type { TBanner } from "@/components/Banner/types";

/**
 * Возвращает классы и инлайн-стили для позиционирования медиа.
 * Поддержка процентов (например: "70%" или "40% 60%") проста и безопасна:
 * - Сейчас проценты применяются для мобильного (базового) вида через CSS-переменные.
 * - Для tablet/desktop продолжаем использовать готовые классы top/bottom/center.
 * - При необходимости можно расширить логику для процентов на брейкпоинтах.
 */
export function getObjectPosition(banner?: TBanner): { className: string; style?: string } {
	// 1) Достаём значения из баннера с понятными дефолтами.
	const mobileRaw  = banner?.position?.mobile  ?? banner?.imagePosition ?? 'center';
	const tabletRaw  = banner?.position?.tablet  ?? banner?.imagePosition ?? 'center';
	const desktopRaw = banner?.position?.desktop ?? banner?.imagePosition ?? 'center';

	// 2) Набор классов для top/bottom/center по брейкпоинтам (привычное поведение)
	const mobileClass  = mobileRaw  === 'top' ? 'media-object-top' : mobileRaw  === 'bottom' ? 'media-object-bottom' : 'media-object-center';
	const tabletClass  = tabletRaw  === 'top' ? 'md:media-object-top' : tabletRaw  === 'bottom' ? 'md:media-object-bottom' : 'md:media-object-center';
	const desktopClass = desktopRaw === 'top' ? 'lg:media-object-top' : desktopRaw === 'bottom' ? 'lg:media-object-bottom' : 'lg:media-object-center';
	
	// 3) Проценты для mobile: поддерживаем "Y%" или "X% Y%". Если указаны проценты, включаем класс
	//    .media-object-pos и подставляем CSS-переменные --obj-x/--obj-y.
	const isPercent = (val?: string) => typeof val === 'string' && /%/.test(val);

	let style: string | undefined;
	let className = `${mobileClass} ${tabletClass} ${desktopClass}`.trim();

	if (isPercent(mobileRaw)) {
		// Разбираем варианты:
		// - "70%" => X по центру (50%), Y = 70%
		// - "40% 60%" => X = 40%, Y = 60%
		const parts = String(mobileRaw).trim().split(/\s+/);
		const x = parts.length === 2 ? parts[0] : '50%';
		const y = parts.length === 2 ? parts[1] : parts[0];
		style = `--obj-x: ${x}; --obj-y: ${y};`;
		className = `media-object-pos ${tabletClass} ${desktopClass}`.trim();
	}

	return { className, style };
}