import { randomUUID } from 'node:crypto';

/** Explicit names intentionally join groups; unnamed instances stay independent. */
export function createGalleryGroup(gallery) {
	return gallery ?? `gallery-${randomUUID()}`;
}

export function galleryImageAttributes(image, title, descriptionMode = 'text') {
	return {
		src: image.url,
		alt: image.title ?? title ?? '',
		title: image.title,
		description: descriptionMode === 'text'
			? image.description?.replace(/<[^>]*>/g, '').trim()
			: image.description,
	};
}
