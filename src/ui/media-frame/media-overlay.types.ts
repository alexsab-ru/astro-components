export const MEDIA_OVERLAY_POSITIONS = [
	'top-left',
	'top-center',
	'top-right',
	'center-left',
	'center',
	'center-right',
	'bottom-left',
	'bottom-center',
	'bottom-right',
] as const;

export type MediaOverlayPosition = (typeof MEDIA_OVERLAY_POSITIONS)[number];
export type MediaOverlayVariant = 'ribbon' | 'panel' | 'plain';
export type MediaOverlayTone = 'dark' | 'light';

export type MediaOverlay = {
	position: MediaOverlayPosition;
	/** Trusted repository-controlled HTML. Do not pass unsanitized user input. */
	html: string;
	icon?: string;
	variant?: MediaOverlayVariant;
	tone?: MediaOverlayTone;
	classes?: string;
	mobile?: {
		position?: MediaOverlayPosition;
		hidden?: boolean;
	};
};

export type MediaImage = {
	imageUrl: string;
	thumbUrl?: string;
	alt?: string;
	overlays?: MediaOverlay[];
};
