import type { CardActionSource } from '@/ui/card-action/types';
import type { MediaImage } from '@/ui/media-frame/media-overlay.types';

export type CardMediaButton = CardActionSource & {
	title: string;
	classes?: string;
	download?: boolean | string;
};

/** Presentation only: no model, inventory or price lookup. */
export interface CardMediaData {
	title?: string;
	subtitle?: string;
	/** Trusted repository HTML: paragraphs, lists or other editorial content. */
	content?: string;
	buttons?: CardMediaButton[];
	imgPlacement?: 'left' | 'right';
	images?: MediaImage[];
	imageAspectRatio?: 'auto' | '4/3' | '16/9' | '3/2' | '1/1';
	imageFit?: 'cover' | 'contain';
	mediaVariant?: 'split' | 'thumbnail';
	/** CSS length limiting a thumbnail, e.g. 12rem. Never stretches beyond its column. */
	thumbnailWidth?: string;
	lightboxDescription?: string;
	gallery?: string;
	headingTag?: 'h2' | 'h3';
	titleClass?: string;
	class?: string;
}
