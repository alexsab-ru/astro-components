import {
	getModelBrandDisplayName,
	getModelThumb,
	getModelTitle,
} from './modelFields.js';

const positiveNumber = (value) => {
	const number = Number(value);
	return Number.isFinite(number) && number > 0 ? number : undefined;
};

export const getChatModelOption = (model, settings = {}) => ({
	label: `${getModelBrandDisplayName(model)} ${getModelTitle(model)}`,
	value: model.id,
	description: model.slogan,
	image:
		(settings.showRealPhoto === true && model.media?.chat) ||
		getModelThumb(model),
	price: settings.showPrice !== false ? positiveNumber(model.price) : undefined,
	benefit:
		settings.showBenefit !== false ? positiveNumber(model.benefit) : undefined,
});
