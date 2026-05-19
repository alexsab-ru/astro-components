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
const brandDomains = (process.env.BRAND_DOMAINS || '')
	.split('\n')
	.map((value) => value.trim())
	.filter(Boolean);
const requestedFiles = (process.env.SPECIFIC_FILES || '')
	.split('\n')
	.map((value) => value.trim())
	.filter((value) => value.endsWith('.json'));

if (!tmpDirectory || !siteDataDirectory || !remoteDataPath) {
	console.error('TMP_DIR, SITE_DATA_DIR and REMOTE_DATA_PATH are required');
	process.exit(1);
}

const commonJsonDirectory = path.join(tmpDirectory, astroJsonDataPath, 'json');
const siteRemoteDirectory = path.join(tmpDirectory, remoteDataPath);
const brandDirectories = brandDomains.map((domain) => path.join(tmpDirectory, 'src', domain));
const commonJsonFiles = listJsonFiles(commonJsonDirectory);

const files = requestedFiles.length > 0
	? requestedFiles.filter((file) => commonJsonFiles.includes(file))
	: commonJsonFiles.sort();

if (files.length === 0) {
	console.log('▶ No layered JSON files found');
	process.exit(0);
}

fs.mkdirSync(siteDataDirectory, { recursive: true });

for (const file of files) {
	const layers = [
		path.join(commonJsonDirectory, file),
		...brandDirectories.map((directory) => path.join(directory, file)),
		path.join(siteRemoteDirectory, file),
	].filter((filePath) => fs.existsSync(filePath));

	if (layers.length === 0) {
		continue;
	}

	const merged = deepMerge(...layers.map(readJson));
	const destination = path.join(siteDataDirectory, file);
	fs.mkdirSync(path.dirname(destination), { recursive: true });
	fs.writeFileSync(destination, `${JSON.stringify(merged, null, 2)}\n`);

	console.log(`  ✔ Layered JSON: ${file} (${layers.length} layers)`);
}
