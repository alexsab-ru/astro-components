export type GalleryImageData = {
	url: string;
	title?: string;
	description?: string;
};

export type GalleryLayout = 'mosaic' | 'simple';
export type GalleryDescriptionMode = 'text' | 'html';

export type GalleryItem = {
	image: GalleryImageData;
	linkClass: string;
	imageClass: string;
};

export type GalleryBlock = {
	className?: string;
	items: GalleryItem[];
};
