import type { MediaImage, MediaOverlay } from '@/ui/media-frame/media-overlay.types';

export type ModelCarsCardImage = MediaImage;

export type ModelCarsCardImageStrategy = 'diagonal' | 'first-car' | 'per-car' | 'vin' | 'car';
export type ModelCarsCardAspectRatio = '4/3' | '16/9' | '3/2' | '1/1';
export type ModelCarsCardImageFit = 'cover' | 'contain';

export type ModelCarsCardImageSelection = {
	strategy?: ModelCarsCardImageStrategy;
	/** Zero-based image indexes. */
	indexes?: number[];
	limit?: number;
	vin?: string;
	carId?: string;
};

export type ModelCarsCardButton = {
	title?: string;
	url?: string;
	dataTitle?: string;
	dataFormName?: string;
	classes?: string;
	popup?: boolean;
};

export type ModelCarsCardOverride = {
	modelId: string;
	show?: boolean;
	order?: number;
	imgPlacement?: 'left' | 'right';
	imageAspectRatio?: ModelCarsCardAspectRatio;
	imageFit?: ModelCarsCardImageFit;
	title?: string;
	subtitle?: string;
	/**
	 * Manual "from" price for this card only.
	 * Replaces the auto min of stock cars + model.price.
	 * Does not change models.json or the car feed.
	 */
	price?: number;
	contentItems?: string[];
	images?: ModelCarsCardImage[];
	/** Default overlays for every selected image. Per-image overlays take precedence. */
	imageOverlays?: MediaOverlay[];
	imageSelection?: ModelCarsCardImageSelection;
	primaryButton?: ModelCarsCardButton;
	secondaryButton?: ModelCarsCardButton;
};
