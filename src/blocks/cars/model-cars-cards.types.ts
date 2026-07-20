export type ModelCarsCardImage = {
	imageUrl: string;
	thumbUrl?: string;
};

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
	contentItems?: string[];
	images?: ModelCarsCardImage[];
	imageSelection?: ModelCarsCardImageSelection;
	primaryButton?: ModelCarsCardButton;
	secondaryButton?: ModelCarsCardButton;
};
