import type { TBanner, Viewport } from "@/components/Banner/types";

export function getMediaUrl<T>(primary?: T, fallback?: T, defaultValue: T = null as any): T {
		return primary ?? fallback ?? defaultValue;
}

function makePositionClasses(pos: Record<Viewport, string>) {
	const map: Record<Viewport, { prefix: string; default: string }> = {
		desktop: { prefix: 'lg:', default: 'media-object-center' },
		tablet:  { prefix: 'md:', default: 'media-object-center' },
		mobile:  { prefix: '',     default: 'media-object-center' },
	};
	return (vp: Viewport) => {
		const val = pos[vp];
		const { prefix, default: def } = map[vp];
		if (val === 'top')    return `${prefix}media-object-top`;
		if (val === 'bottom') return `${prefix}media-object-bottom`;
		return `${prefix}${def}`;
	};
}

function setPositions(banner: TBanner){
	return {
		desktop: banner?.position?.desktop ?? banner?.imagePosition ?? 'center',
		tablet:  banner?.position?.tablet  ?? banner?.imagePosition ?? 'center',
		mobile:  banner?.position?.mobile  ?? banner?.imagePosition ?? 'center'
	};
}

export function getPositions(banner: TBanner){
	const getClass = makePositionClasses(setPositions(banner));
	const desktopPositionClass = getClass('desktop');
	const tabletPositionClass  = getClass('tablet');
	const mobilePositionClass  = getClass('mobile');
	return {desktopPositionClass, tabletPositionClass, mobilePositionClass};
}