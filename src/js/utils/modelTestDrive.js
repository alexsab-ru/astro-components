import { getModelBrandId } from './modelFields.js';
import { isModelVisible } from './modelVisibility.js';
import { normalizeModelId } from './normalizeModelId.js';

// testDrive is generated from model-matrix.json, independently of the sales list.
export function isModelTestDriveEnabled(model, testDriveModels = []) {
	const brandId = getModelBrandId(model).toLowerCase();
	const modelId = normalizeModelId(model?.id);
	if (!brandId || !modelId || !Array.isArray(testDriveModels)) return false;

	return testDriveModels.some(
		(candidate) =>
			isModelVisible(candidate) &&
			getModelBrandId(candidate).toLowerCase() === brandId &&
			normalizeModelId(candidate?.id) === modelId
	);
}

export function getModelFeedbackTitle(model, testDriveModels) {
	return isModelTestDriveEnabled(model, testDriveModels)
		? 'Записаться на тест-драйв'
		: 'Получить спецпредложение';
}
