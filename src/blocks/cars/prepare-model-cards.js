import {
	getModelBrandDisplayName,
	getModelImage,
	getModelThumb,
	getModelTitle,
} from '../../js/utils/modelFields.js';
import { isModelVisible } from '../../js/utils/modelVisibility.js';
import { isModelTestDriveEnabled } from '../../js/utils/modelTestDrive.js';
import { currencyFormat } from '../../js/utils/numbers.format.js';

const DEFAULT_IMAGE_SELECTION = { strategy: 'diagonal', limit: 5 };
const PRIMARY_BUTTON_CLASSES =
	'w-full flex items-center justify-center px-4 xl:px-8 py-2 xl:py-3 text-base text-white no-underline text-center bg-accent-500 hover:bg-accent-600';
const SECONDARY_BUTTON_CLASSES =
	'w-full flex items-center justify-center px-4 xl:px-8 py-2 xl:py-3 text-base text-white! no-underline text-center bg-black hover:bg-black/90';

const positiveNumber = (value) => {
	const number = Number(value);
	return Number.isFinite(number) && number > 0 ? number : 0;
};

const uniqueImages = (images) => {
	const urls = new Set();
	return images.filter((image) => {
		if (!image?.imageUrl || urls.has(image.imageUrl)) return false;
		urls.add(image.imageUrl);
		return true;
	});
};

const escapeHtml = (value) =>
	String(value ?? '').replace(
		/[&<>'"]/g,
		(character) =>
			({
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				"'": '&#39;',
				'"': '&quot;',
			})[character] || character
	);

const getCarImages = (car) => {
	const data = car?.data || {};

	if (Array.isArray(data.imageSets) && data.imageSets.length) {
		return uniqueImages(
			data.imageSets.map((image) => ({
				imageUrl: image?.full || image?.large || image?.medium,
				thumbUrl:
					image?.large ||
					image?.medium ||
					image?.full ||
					image?.small ||
					image?.thumb,
			}))
		);
	}

	if (Array.isArray(data.images) && data.images.length) {
		return uniqueImages(
			data.images.map((imageUrl, index) => ({
				imageUrl,
				thumbUrl: data.thumbs?.[index] || imageUrl,
			}))
		);
	}

	if (Array.isArray(data.thumbs) && data.thumbs.length) {
		return uniqueImages(
			data.thumbs.map((imageUrl) => ({ imageUrl, thumbUrl: imageUrl }))
		);
	}

	return data.image ? [{ imageUrl: data.image, thumbUrl: data.image }] : [];
};

const getCarVins = (car) => {
	const data = car?.data || {};
	return [data.vin, data.vin_list, data.vin_hidden]
		.flatMap((value) => String(value || '').split(','))
		.map((value) => value.trim().toLowerCase())
		.filter(Boolean);
};

const carIdMatches = (car, carId) => {
	const normalizedId = carId.trim().toLowerCase();
	if (!normalizedId) return false;
	if (String(car?.id || '').toLowerCase() === normalizedId) return true;

	const urlParts = String(car?.data?.url || '')
		.split('/')
		.filter(Boolean);
	return String(urlParts.at(-1) || '').toLowerCase() === normalizedId;
};

const selectIndexes = (images, indexes, limit) => {
	const selected = indexes?.length
		? indexes.map((index) => images[index]).filter(Boolean)
		: images.slice(0, limit);
	return selected.slice(0, limit);
};

const selectCarImages = (modelCars, selection) => {
	const strategy = selection.strategy || DEFAULT_IMAGE_SELECTION.strategy;
	const limit =
		positiveNumber(selection.limit) || DEFAULT_IMAGE_SELECTION.limit;

	if (!modelCars.length) return [];

	if (strategy === 'vin' || strategy === 'car') {
		const vin = String(selection.vin || '')
			.trim()
			.toLowerCase();
		const carId = String(selection.carId || '');
		const selectedCar =
			strategy === 'vin'
				? vin
					? modelCars.find((car) => getCarVins(car).includes(vin))
					: undefined
				: modelCars.find((car) => carIdMatches(car, carId));
		if (selectedCar)
			return uniqueImages(
				selectIndexes(
					getCarImages(selectedCar),
					selection.indexes,
					limit
				)
			);

		return selectCarImages(modelCars, { strategy: 'diagonal', limit });
	}

	if (strategy === 'first-car') {
		return uniqueImages(
			selectIndexes(getCarImages(modelCars[0]), selection.indexes, limit)
		);
	}

	if (strategy === 'per-car') {
		const indexes = selection.indexes?.length ? selection.indexes : [0];
		const selected = modelCars.flatMap((car) => {
			const images = getCarImages(car);
			return indexes.map((index) => images[index]).filter(Boolean);
		});
		return uniqueImages(selected).slice(0, limit);
	}

	const selected = modelCars
		.map((car, index) => getCarImages(car)[index])
		.filter(Boolean);
	return uniqueImages(selected).slice(0, limit);
};

const resolveButton = (defaults, globalButton, cardButton, cardTitle) => {
	const button = { ...defaults, ...globalButton, ...cardButton };
	const title = button.title || defaults.title || '';

	return {
		...button,
		title,
		dataTitle: button.dataTitle || `${title} на&nbsp;${cardTitle}`,
		dataFormName: button.dataFormName || `${title}. ${cardTitle}`,
		action: button.popup
			? {
					type: 'popup',
					id: String(button.url || '#common-modal').replace(/^#/, ''),
					title: button.dataTitle || `${title} на&nbsp;${cardTitle}`,
					formName: button.dataFormName || `${title}. ${cardTitle}`,
				}
			: { type: 'link', url: button.url },
		classes:
			`${button.popup ? 'popup-link ' : ''}${button.classes || ''}`.trim(),
	};
};

/** Prepare model offers without reading site JSON, environment, DOM or mutating inputs.
 * The adapter supplies already-visible stock and the existing feed/model resolver.
 */
export function prepareModelCards(
	{
		models = [],
		testDriveModels = [],
		cars = [],
		overrides = [],
		onlyWithCars = false,
		imageSelection = DEFAULT_IMAGE_SELECTION,
		primaryButton = {},
		secondaryButton = {},
		offerPrefix = '',
		imgPlacement = 'alternate',
		imageAspectRatio = '4/3',
		imageFit = 'cover',
	},
	findModelByCarData
) {
	const overrideByModelId = new Map(
		overrides.map((override) => [override.modelId, override])
	);
	const carsByModelId = new Map();

	cars.forEach((car) => {
		const model = findModelByCarData(car?.data);
		if (!model?.id) return;

		const modelCars = carsByModelId.get(model.id) || [];
		modelCars.push(car);
		carsByModelId.set(model.id, modelCars);
	});

	return models
		.map((model, modelIndex) => {
			const override = overrideByModelId.get(model.id);
			const modelCars = carsByModelId.get(model.id) || [];
			const isVisible =
				override?.show ??
				(isModelVisible(model) &&
					(!onlyWithCars || modelCars.length > 0));
			if (!isVisible) return null;

			const selection = {
				...DEFAULT_IMAGE_SELECTION,
				...imageSelection,
				...override?.imageSelection,
			};
			let images = override?.images
				? uniqueImages(override.images)
				: selectCarImages(modelCars, selection);

			if (!images.length) {
				const modelImage = getModelImage(model) || getModelThumb(model);
				if (modelImage)
					images = [{ imageUrl: modelImage, thumbUrl: modelImage }];
			}
			if (!images.length) return null;

			const offerId = `${offerPrefix}${model.id}`;
			const brand = getModelBrandDisplayName(model);
			const modelTitle = getModelTitle(model);
			const title = override?.title || `${brand} ${modelTitle}`.trim();
			images = images.map((image, imageIndex) => ({
				...image,
				alt: image.alt || `${title}, фото ${imageIndex + 1}`,
				overlays: image.overlays ?? override?.imageOverlays,
			}));
			const carPrices = modelCars
				.map(
					(car) =>
						positiveNumber(car?.data?.priceWithDiscount) ||
						positiveNumber(car?.data?.sale_price) ||
						positiveNumber(car?.data?.price)
				)
				.filter(Boolean);
			// Цена модели — минимум среди цен автомобилей в наличии И цены самой модели.
			// Цена модели участвует в сравнении наравне с ценами машин, а не только как запасной вариант.
			const priceCandidates = [
				...carPrices,
				positiveNumber(model.price),
			].filter(Boolean);
			const autoPrice = priceCandidates.length
				? Math.min(...priceCandidates)
				: 0;
			// Ручная цена со страницы побеждает авторасчёт.
			// Меняет только эту карточку. Сток и models.json не трогает.
			const overridePrice = positiveNumber(override?.price);
			const price = overridePrice || autoPrice;
			const carBenefits = modelCars
				.map((car) => positiveNumber(car?.data?.max_discount))
				.filter(Boolean);
			const benefit = carBenefits.length
				? Math.max(...carBenefits)
				: positiveNumber(model.benefit);
			const contentItems =
				override?.contentItems ||
				[
					benefit ? `Выгода до ${currencyFormat(benefit)}` : '',
					...(Array.isArray(model.benefits)
						? model.benefits.map((item) => item?.label)
						: []),
				].filter(Boolean);

			const secondary = resolveButton(
				{
					id: 'testDrive',
					title: 'Записаться на тест-драйв',
					url: '#common-modal',
					classes: SECONDARY_BUTTON_CLASSES,
					popup: true,
				},
				secondaryButton,
				override?.secondaryButton,
				title
			);

			return {
				model,
				offerId,
				title,
				subtitle: override?.subtitle ?? model.slogan ?? '',
				price:
					override?.priceText ?? (price ? currencyFormat(price) : ''),
				pricePrefix: override?.pricePrefix ?? 'Цена от ',
				contentItems,
				content: override?.content,
				images,
				order: override?.order ?? modelIndex,
				hasCustomOrder: override?.order !== undefined,
				imgPlacement: override?.imgPlacement,
				imageAspectRatio:
					override?.imageAspectRatio || imageAspectRatio,
				imageFit: override?.imageFit || imageFit,
				lightboxDescription: `<div class="flex justify-center py-3"><button type="button" class="btn px-6! py-3!" data-model-lightbox-offer-trigger="${escapeHtml(offerId)}">Получить предложение</button></div>`,
				primaryButton: resolveButton(
					{
						title: 'Получить максимальную выгоду',
						url: '#common-modal',
						classes: PRIMARY_BUTTON_CLASSES,
						popup: true,
					},
					primaryButton,
					override?.primaryButton,
					title
				),
				secondaryButton:
					secondary.id !== 'testDrive' ||
					isModelTestDriveEnabled(model, testDriveModels)
						? secondary
						: null,
			};
		})
		.filter(Boolean)
		.sort((first, second) => {
			if (first.hasCustomOrder !== second.hasCustomOrder)
				return first.hasCustomOrder ? -1 : 1;
			return first.order - second.order;
		})
		.map((card, index) => ({
			...card,
			imgPlacement:
				card.imgPlacement ||
				(imgPlacement === 'alternate'
					? index % 2 === 0
						? 'left'
						: 'right'
					: imgPlacement),
		}));
}
