import fs from 'fs';
import path from 'path';

const logSuccess = (msg) => console.log('\x1b[30;42m%s\x1b[0m', msg);
const logWarning = (msg) => console.log('\x1b[30;43m%s\x1b[0m', msg);
const logError = (msg) => console.log('\x1b[30;41m%s\x1b[0m', msg);

const isPlainObject = (value) =>
	value !== null &&
	typeof value === 'object' &&
	!Array.isArray(value);

const deepMerge = (...layers) =>
	layers.reduce((result, layer) => {
		if (!isPlainObject(layer)) {
			return result;
		}

		for (const [key, value] of Object.entries(layer)) {
			if (value === undefined) {
				continue;
			}

			if (isPlainObject(value) && isPlainObject(result[key])) {
				result[key] = deepMerge(result[key], value);
				continue;
			}

			if (isPlainObject(value)) {
				result[key] = deepMerge({}, value);
				continue;
			}

			if (Array.isArray(value)) {
				result[key] = [...value];
				continue;
			}

			result[key] = value;
		}

		return result;
	}, {});

const readJson = (filePath) => {
	try {
		return JSON.parse(fs.readFileSync(filePath, 'utf8'));
	} catch (err) {
		logError(`Ошибка чтения JSON файла: ${filePath}`);
		return null;
	}
};

const readOptionalJson = (filePath) => {
	if (!fs.existsSync(filePath)) {
		return {};
	}

	return readJson(filePath) ?? {};
};

const normalizeModelIds = (value) => {
	if (value === '*') {
		return '*';
	}

	if (!Array.isArray(value)) {
		return [];
	}

	return value.map((id) => String(id).trim().toLowerCase()).filter(Boolean);
};

const normalizeOrder = (value) =>
	Array.isArray(value)
		? value.map((id) => String(id).trim().toLowerCase()).filter(Boolean)
		: [];

const getModelSortName = (brandId, modelId) => {
	const modelData = deepMerge(
		readOptionalJson(path.join(commonDataDirectory, 'brands', brandId, 'models', `${modelId}.json`)),
		readOptionalJson(path.join(siteDataDirectory, 'data', 'brands', brandId, 'models', `${modelId}.json`)),
	);

	return String(modelData.displayName || modelData.name || modelId).toLowerCase();
};

const listBrandModelIds = (brandId) => {
	const modelsDirectory = path.join(commonDataDirectory, 'brands', brandId, 'models');

	if (!fs.existsSync(modelsDirectory)) {
		logWarning(`Папка моделей бренда не найдена: ${modelsDirectory}`);
		return [];
	}

	return fs
		.readdirSync(modelsDirectory, { withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
		.map((entry) => path.basename(entry.name, '.json'))
		.sort();
};

const sortWildcardModelIds = (brandId, modelIds, modelOrder) => {
	const availableIds = new Set(modelIds);
	const orderMap = new Map(modelOrder.map((modelId, index) => [modelId, index]));
	const orderedIds = modelOrder.filter((modelId) => availableIds.has(modelId));
	const restIds = modelIds
		.filter((modelId) => !orderMap.has(modelId))
		.sort((a, b) => {
			const nameCompare = getModelSortName(brandId, a).localeCompare(
				getModelSortName(brandId, b),
				'ru',
			);

			return nameCompare || a.localeCompare(b, 'ru');
		});

	return [...orderedIds, ...restIds];
};

const expandMatrixItems = (items = []) =>
	items.flatMap((item) => {
		const brandId = String(item?.brandId ?? '').trim().toLowerCase();
		const modelIds = normalizeModelIds(item?.modelIds);
		const modelOrder = normalizeOrder(item?.modelOrder);

		if (!brandId) {
			logWarning('Пропущена запись model-matrix без brandId');
			return [];
		}

		const ids =
			modelIds === '*'
				? sortWildcardModelIds(brandId, listBrandModelIds(brandId), modelOrder)
				: modelIds;

		return ids.map((modelId) => ({ brandId, modelId }));
	});

const addDisclaimersToModel = (model, brandId, modelId, federalDisclaimer) => {
	if (!federalDisclaimer || Object.keys(federalDisclaimer).length === 0) {
		return model;
	}

	const disclaimer = federalDisclaimer[`${brandId}-${modelId}`];

	if (!disclaimer) {
		return model;
	}

	logSuccess(`Добавлен дисклеймер для модели ${brandId} ${modelId}`);

	return {
		...model,
		priceDisclaimer: disclaimer.price || '',
		benefitDisclaimer: disclaimer.benefit || '',
	};
};

const refResolvers = {
	benefitRefs: {
		registryFile: 'defaults/benefits.json',
		localOverridesKey: 'benefitOverrides',
		outputKey: 'benefits',
		mode: 'array',
	},
};

const resolveRefs = (model, layers) => {
	const resolvedModel = { ...model };

	for (const [refsKey, config] of Object.entries(refResolvers)) {
		const refs = Array.isArray(resolvedModel[refsKey]) ? resolvedModel[refsKey] : [];
		const registry = deepMerge(
			readOptionalJson(path.join(commonDataDirectory, config.registryFile)),
			...layers.map((layer) => layer?.[config.localOverridesKey]).filter(isPlainObject),
		);

		if (config.mode === 'array') {
			resolvedModel[config.outputKey] = refs
				.map((ref) => {
					const item = registry[ref];

					if (!item) {
						logWarning(`Не найдена ссылка ${refsKey}: ${ref}`);
						return null;
					}

					return item;
				})
				.filter(Boolean);
		}

		delete resolvedModel[refsKey];
		delete resolvedModel[config.localOverridesKey];
	}

	return resolvedModel;
};

const buildModel = (brandId, modelId, federalDisclaimer) => {
	const layers = [
		readOptionalJson(path.join(commonDataDirectory, 'defaults', 'model.json')),
		readOptionalJson(path.join(commonDataDirectory, 'brands', brandId, 'defaults.json')),
		readOptionalJson(path.join(commonDataDirectory, 'brands', brandId, 'models', `${modelId}.json`)),
		readOptionalJson(path.join(siteDataDirectory, 'data', 'defaults.json')),
		readOptionalJson(path.join(siteDataDirectory, 'data', 'brands', brandId, 'defaults.json')),
		readOptionalJson(path.join(siteDataDirectory, 'data', 'brands', brandId, 'models', `${modelId}.json`)),
	];

	if (!fs.existsSync(path.join(commonDataDirectory, 'brands', brandId, 'models', `${modelId}.json`))) {
		logWarning(`Базовая модель не найдена: ${brandId}/${modelId}`);
	}

	const model = deepMerge(...layers);
	model.id = modelId;

	return addDisclaimersToModel(resolveRefs(model, layers), brandId, modelId, federalDisclaimer);
};

const siteDataDirectory = process.env.SITE_DATA_DIR
	? path.resolve(process.cwd(), process.env.SITE_DATA_DIR)
	: path.join(process.cwd(), 'src', 'data', 'site');
const commonDataDirectory = process.env.COMMON_DATA_DIR
	? path.resolve(process.cwd(), process.env.COMMON_DATA_DIR)
	: path.join(process.cwd(), 'src', 'data', 'common');

const modelMatrixFilePath = path.join(siteDataDirectory, 'model-matrix.json');
const federalDisclaimerFilePath = path.join(siteDataDirectory, 'federal-disclaimer.json');
const modelsFilePath = path.join(siteDataDirectory, 'models.json');

const data = {
	models: [],
	testDrive: [],
	service: [],
};

try {
	const modelMatrix = readJson(modelMatrixFilePath);
	if (!modelMatrix) {
		throw new Error('Не удалось загрузить файл model-matrix.json');
	}

	const federalDisclaimer = readOptionalJson(federalDisclaimerFilePath);
	const buildMatrixGroup = (items) =>
		expandMatrixItems(items).map(({ brandId, modelId }) =>
			buildModel(brandId, modelId, federalDisclaimer),
		);

	data.models = buildMatrixGroup(modelMatrix.models);
	data.testDrive = buildMatrixGroup(modelMatrix.testDrive);
	data.service = buildMatrixGroup(modelMatrix.service);

	if (
		data.models.length === 0 &&
		data.testDrive.length === 0 &&
		data.service.length === 0
	) {
		logWarning('Ни одна модель не добавлена из model-matrix.json. models.json будет пустым.');
	} else {
		logSuccess('models.json успешно собран из model-matrix.json и слоёв данных');
	}
} catch (err) {
	logError(`Ошибка при обработке моделей: ${err.message}`);
}

fs.writeFileSync(modelsFilePath, JSON.stringify(data, null, 2) + '\n');
