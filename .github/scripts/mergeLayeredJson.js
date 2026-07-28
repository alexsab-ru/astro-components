import fs from 'fs';
import path from 'path';

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

			if (value === null) {
				result[key] = null;
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
		throw new Error(`Failed to read ${filePath}: ${err.message}`);
	}
};

const listJsonFiles = (directory) => {
	if (!fs.existsSync(directory)) {
		return [];
	}

	return fs
		.readdirSync(directory, { withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
		.map((entry) => entry.name);
};

const tmpDirectory = process.env.TMP_DIR;
const siteDataDirectory = process.env.SITE_DATA_DIR;
const remoteDataPath = process.env.REMOTE_DATA_PATH;
const astroJsonDataPath = process.env.ASTRO_JSON_DATA_PATH || 'data';
const astroContentDirectory = process.env.ASTRO_CONTENT_DIR || 'src/content';
const brandDomains = (process.env.BRAND_DOMAINS || '')
	.split('\n')
	.map((value) => value.trim())
	.filter(Boolean);
const specificFiles = (process.env.SPECIFIC_FILES || '')
	.split('\n')
	.map((value) => value.trim())
	.filter(Boolean);
const requestedFiles = specificFiles.filter((value) => value.endsWith('.json'));

if (!tmpDirectory || !siteDataDirectory || !remoteDataPath) {
	console.error('TMP_DIR, SITE_DATA_DIR and REMOTE_DATA_PATH are required');
	process.exit(1);
}

// ==================================================
// Переопределения из панели управления (CP).
// БД панели — источник истины для файлов дилера: контент, сохраненный в CP,
// накладывается поверх локальных файлов репозитория astro-json.
// При недоступном API сборка продолжается полностью на локальных файлах.
// ==================================================
const cpApiUrl = (process.env.CP_API_URL || '').trim().replace(/\/+$/, '');
const builderToken = (process.env.BUILDER_SERVICE_TOKEN || '').trim();
const dealerDomain = (process.env.DOMAIN || '').trim();

const fetchCpOverrides = async () => {
	if (!cpApiUrl || !builderToken || !dealerDomain) {
		return null;
	}

	const query = specificFiles.length > 0
		? `?files=${encodeURIComponent(specificFiles.join(','))}`
		: '';
	const url = `${cpApiUrl}/projects/${encodeURIComponent(dealerDomain)}/overrides${query}`;

	try {
		const response = await fetch(url, {
			headers: { 'X-Builder-Token': builderToken },
			signal: AbortSignal.timeout(15000),
		});
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}
		const payload = await response.json();
		const overrides = new Map();
		for (const file of payload.files || []) {
			// Защита от неожиданных путей из БД.
			if (!file.path || file.path.includes('..') || path.isAbsolute(file.path)) {
				continue;
			}
			overrides.set(file.path, file);
		}
		console.log(`▶ CP overrides: получено файлов: ${overrides.size} (${url})`);
		return overrides;
	} catch (err) {
		console.warn(`⚠ CP overrides недоступны (${err.message}) — собираем на локальных файлах`);
		return null;
	}
};

const cpOverrides = await fetchCpOverrides();

const commonJsonDirectory = path.join(tmpDirectory, astroJsonDataPath, 'json');
const siteRemoteDirectory = path.join(tmpDirectory, remoteDataPath);
const brandDirectories = brandDomains.map((domain) => path.join(tmpDirectory, 'src', domain));
const commonJsonFiles = listJsonFiles(commonJsonDirectory);

const files = requestedFiles.length > 0
	? requestedFiles.filter((file) => commonJsonFiles.includes(file))
	: commonJsonFiles.sort();

fs.mkdirSync(siteDataDirectory, { recursive: true });

for (const file of files) {
	const layerPaths = [
		path.join(commonJsonDirectory, file),
		...brandDirectories.map((directory) => path.join(directory, file)),
	].filter((filePath) => fs.existsSync(filePath));
	const layers = layerPaths.map(readJson);

	// Дилерский слой: версия из CP (если есть) заменяет локальный файл целиком —
	// удаления ключей в панели тоже должны попадать в сборку.
	const override = cpOverrides?.get(file);
	const siteLayerPath = path.join(siteRemoteDirectory, file);
	if (override && override.type === 'json') {
		layers.push(override.content);
		cpOverrides.delete(file);
	} else if (fs.existsSync(siteLayerPath)) {
		layers.push(readJson(siteLayerPath));
	}

	if (layers.length === 0) {
		continue;
	}

	const merged = deepMerge(...layers);
	const destination = path.join(siteDataDirectory, file);
	fs.mkdirSync(path.dirname(destination), { recursive: true });
	fs.writeFileSync(destination, `${JSON.stringify(merged, null, 2)}\n`);

	console.log(`  ✔ Layered JSON: ${file} (${layers.length} layers${override ? ', CP override' : ''})`);
}

if (files.length === 0) {
	console.log('▶ No layered JSON files found');
}

// Оставшиеся переопределения — файлы дилера вне слоеного набора:
// JSON (salons.json, data/... и т.п.) перезаписывают копии в SITE_DATA_DIR,
// MDX из content/ — файлы в src/content (спецпредложения из CP).
if (cpOverrides && cpOverrides.size > 0) {
	let applied = 0;
	for (const [filePath, file] of cpOverrides) {
		let destination = null;
		let contents = null;

		if (file.type === 'json' && filePath.endsWith('.json')) {
			if (requestedFiles.length > 0 && !requestedFiles.includes(filePath)) {
				continue;
			}
			destination = path.join(siteDataDirectory, filePath);
			contents = `${JSON.stringify(file.content, null, 2)}\n`;
		} else if (file.type === 'mdx' && filePath.startsWith('content/')) {
			destination = path.join(astroContentDirectory, filePath.slice('content/'.length));
			contents = typeof file.content === 'string' ? file.content : '';
		} else {
			console.warn(`  ⚠ CP override пропущен (неизвестное назначение): ${filePath}`);
			continue;
		}

		fs.mkdirSync(path.dirname(destination), { recursive: true });
		fs.writeFileSync(destination, contents);
		applied += 1;
		console.log(`  ✔ CP override: ${filePath} → ${destination}`);
	}
	if (applied > 0) {
		console.log(`▶ CP overrides применены: ${applied}`);
	}
}
