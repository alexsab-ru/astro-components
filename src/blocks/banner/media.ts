import type { TBanner } from "./types";

/**
 * Конвертирует значение позиции в CSS object-position.
 * 'top' → '50% 0%', 'center' → '50% 50%', 'bottom' → '50% 100%'
 * '70%' → '50% 70%', '40% 60%' → '40% 60%'
 */
function toPosition(value: string): string {
	const v = value.trim();
	if (v === 'top') return '50% 0%';
	if (v === 'bottom') return '50% 100%';
	if (v === 'center') return '50% 50%';
	if (/%/.test(v)) {
		const parts = v.split(/\s+/);
		return parts.length === 2 ? `${parts[0]} ${parts[1]}` : `50% ${parts[0]}`;
	}
	return '50% 50%';
}

export function getObjectPosition(banner?: TBanner): { className: string; style: string } {
	const mobileRaw  = banner?.position?.mobile  ?? banner?.imagePosition ?? 'center';
	const tabletRaw  = banner?.position?.tablet  ?? banner?.imagePosition ?? 'center';
	const desktopRaw = banner?.position?.desktop ?? banner?.imagePosition ?? 'center';

	const style = `--pos: ${toPosition(mobileRaw)}; --pos-md: ${toPosition(tabletRaw)}; --pos-lg: ${toPosition(desktopRaw)};`;

	return { className: 'banner-pos', style };
}
