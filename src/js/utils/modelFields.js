export const getModelBrandId = (model = {}) =>
	model?.brand?.id || model?.mark_id?.toLowerCase?.() || '';

export const getModelBrandDisplayName = (model = {}) =>
	model?.brand?.displayName || model?.brand?.name || model?.mark_id || '';

export const getModelBrandLegalName = (model = {}) =>
	model?.brand?.legalName || getModelBrandDisplayName(model);

export const getModelBrandUrlName = (model = {}) =>
	model?.brand?.urlName || getModelBrandId(model);

export const getModelBrandValue = (model = {}) =>
	model?.brand?.Name || model?.brand?.name || getModelBrandDisplayName(model);

export const getModelTitle = (model = {}) =>
	model?.displayName || model?.caption || model?.name || '';

export const getModelMedia = (model = {}) => model?.media || {};

export const getModelHomeImg = (model = {}) =>
	getModelMedia(model).homeImg || model?.homeImg || '';

export const getModelThumb = (model = {}) =>
	getModelMedia(model).thumb || model?.thumb || '';

export const getModelImage = (model = {}) =>
	getModelMedia(model).image || model?.image || getModelThumb(model);

export const getModelColorImage = (color = {}) =>
	color?.image || color?.carImage || '';

// The form illustrates the car, independently of page.blocks and gallery order.
export const getModelFeedbackImage = (model = {}) =>
	model?.page?.feedbackForm?.imageUrl ??
	(getModelHomeImg(model) ||
		(Array.isArray(model?.colors)
			? model.colors.map(getModelColorImage).find(Boolean)
			: '') ||
		getModelImage(model));

export const getModelFeedModelNames = (model = {}) => [
	...(Array.isArray(model?.feed?.folderIds) ? model.feed.folderIds : []),
	...(Array.isArray(model?.feed?.modelNames) ? model.feed.modelNames : []),
	...(Array.isArray(model?.feed_names) ? model.feed_names : []),
].filter(Boolean);

export const getModelFeedBrandNames = (model = {}) => [
	...(Array.isArray(model?.feed?.brandNames) ? model.feed.brandNames : []),
	...(Array.isArray(model?.feed?.markIds) ? model.feed.markIds : []),
	...(model?.feed?.markId ? [model.feed.markId] : []),
	...(model?.mark_id ? [model.mark_id] : []),
	...(getModelBrandDisplayName(model) ? [getModelBrandDisplayName(model)] : []),
].filter(Boolean);
