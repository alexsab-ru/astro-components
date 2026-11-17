// Explicit utility strings keep all responsive layouts visible to Tailwind.
const columns = { 4: 'col-span-4', 5: 'col-span-5', 6: 'col-span-6', 7: 'col-span-7', 8: 'col-span-8', 12: 'col-span-12' };
const mosaicClass = 'grid grid-cols-12 gap-1 sm:gap-2 md:gap-3 xl:gap-4 mb-4';
const naturalImageClass = 'h-auto w-full rounded md:rounded-xl cursor-pointer';

const sixBlock = images => [
	{ image: images[0], colSpan: 4, stretch: true },
	{ image: images[1], colSpan: 8 },
	{ image: images[2], colSpan: 8 },
	{ image: images[3], colSpan: 4, stretch: true },
	{ image: images[4], colSpan: 6 },
	{ image: images[5], colSpan: 6 },
];

function specificBlock(images) {
	if (images.length === 1) return [{ image: images[0], colSpan: 12, contain: true }];
	if (images.length === 2) return images.map(image => ({ image, colSpan: 6 }));
	if (images.length === 3) return images.map((image, index) => ({ image, colSpan: index === 2 ? 12 : 6 }));
	if (images.length === 4) return [
		{ image: images[0], colSpan: 8 },
		{ image: images[1], colSpan: 4, stretch: true },
		{ image: images[2], colSpan: 4, stretch: true },
		{ image: images[3], colSpan: 8 },
	];
	if (images.length === 5) return [
		{ image: images[0], colSpan: 7, rowSpan: 2 },
		{ image: images[1], colSpan: 5 },
		{ image: images[2], colSpan: 5 },
		{ image: images[3], colSpan: 6 },
		{ image: images[4], colSpan: 6 },
	];
	return sixBlock(images);
}

function mosaicItem({ image, colSpan, rowSpan, stretch, contain }) {
	return {
		image,
		linkClass: ['relative block overflow-hidden rounded-xl cursor-pointer', columns[colSpan],
			rowSpan === 2 ? 'row-span-2' : stretch ? 'self-stretch' : 'aspect-video'].join(' '),
		imageClass: `absolute inset-0 w-full h-full ${contain ? 'object-contain' : 'object-cover'}`,
	};
}

/**
 * Pure layout preparation: no mutation, lightbox state or DOM operations.
 * @param {import('./types').GalleryImageData[]} images
 * @param {import('./types').GalleryLayout} layout
 * @returns {import('./types').GalleryBlock[]}
 */
export function createGalleryBlocks(images, layout = 'mosaic') {
	if (!images.length) return [];
	if (layout === 'simple') {
		if (images.length === 1) return [{ items: [{ image: images[0], linkClass: 'block', imageClass: naturalImageClass }] }];
		const odd = images.length % 2 !== 0;
		const gridImages = odd ? images.slice(0, -1) : images;
		const blocks = [{
			className: 'grid grid-cols-2 gap-2 md:gap-4 items-stretch',
			items: gridImages.map(image => ({
				image, linkClass: 'flex flex-col m-0!',
				imageClass: 'w-full flex-1 rounded md:rounded-xl object-cover aspect-video cursor-pointer',
			})),
		}];
		if (odd) blocks.push({ items: [{ image: images[images.length - 1], linkClass: 'block mt-4', imageClass: naturalImageClass }] });
		return blocks;
	}

	const blocks = [];
	let offset = 0;
	while (offset < images.length) {
		const remaining = images.length - offset;
		if (remaining <= 6) {
			blocks.push(specificBlock(images.slice(offset)));
			offset = images.length;
		} else if (remaining === 7) {
			blocks.push(sixBlock(images.slice(offset, offset + 6)));
			blocks.push([{ image: images[offset + 6], colSpan: 12 }]);
			offset += 7;
		} else {
			blocks.push(sixBlock(images.slice(offset, offset + 6)));
			offset += 6;
		}
	}
	return blocks.map(block => ({ className: mosaicClass, items: block.map(mosaicItem) }));
}
