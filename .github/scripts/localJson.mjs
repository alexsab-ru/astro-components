import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { buildLayerMap, planContentCopies } from './layerResolution.mjs';
import { listFiles } from './syncBrandLayers.mjs';

// This single link records the selected source for both Vite and Tailwind.
export const sourceLink = (root) => path.join(root, 'src/scss/.json-site');
const readJson = (file, fallback = {}) => fs.existsSync(file)
	? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;

export function resolveJsonSource(root, localPath, environment = process.env) {
	const envFile = path.join(root, '.env');
	const env = { ...(fs.existsSync(envFile) ? dotenv.parse(fs.readFileSync(envFile)) : {}), ...environment };
	const domain = (env.DOMAIN ?? '').trim();
	if (!domain || domain.includes('..') || /[/\\\0]/.test(domain)) {
		throw new Error('DOMAIN должен быть именем папки сайта');
	}
	const jsonRoot = fs.realpathSync(path.resolve(root, localPath || env.ASTRO_JSON_LOCAL_PATH || '../astro-json'));
	const siteDir = path.join(jsonRoot, 'src', domain);
	if (!fs.statSync(siteDir).isDirectory()) throw new Error(`Нет папки сайта: ${siteDir}`);
	return { jsonRoot, siteDir };
}

export function linkedJsonSource(root) {
	const link = sourceLink(root);
	if (!fs.lstatSync(link, { throwIfNoEntry: false })?.isSymbolicLink()) return undefined;
	const siteDir = fs.realpathSync(link);
	return { siteDir, jsonRoot: path.resolve(siteDir, '../..') };
}

export function relativeImport(fromDir, target) {
	const relative = path.relative(fromDir, target).split(path.sep).join('/');
	return relative.startsWith('.') ? relative : `./${relative}`;
}

export function linkFile(source, destination) {
	const target = relativeImport(path.dirname(destination), source);
	if (fs.lstatSync(destination, { throwIfNoEntry: false })?.isSymbolicLink()
		&& fs.readlinkSync(destination) === target) return;
	fs.mkdirSync(path.dirname(destination), { recursive: true });
	fs.rmSync(destination, { force: true });
	fs.symlinkSync(target, destination);
}

// Never write through a legacy link into astro-json.
export function writeLocalFile(destination, contents) {
	const stat = fs.lstatSync(destination, { throwIfNoEntry: false });
	if (stat?.isSymbolicLink()) fs.unlinkSync(destination);
	else if (stat?.isFile() && fs.readFileSync(destination).equals(Buffer.from(contents))) return;
	fs.mkdirSync(path.dirname(destination), { recursive: true });
	fs.writeFileSync(destination, contents);
}

// Match downloadCommonRepo's recursive brand discovery and normalized folder names.
function brandDomains(settings) {
	const brands = new Set();
	function walk(value) {
		if (!value || typeof value !== 'object') return;
		for (const brand of [value.brand].flat()) {
			if (typeof brand !== 'string') continue;
			for (const name of brand.split(',')) {
				const normalized = name.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().replace(/ +/g, '-');
				if (normalized) brands.add(`${normalized}.alexsab.ru`);
			}
		}
		Object.values(value).forEach(walk);
	}
	walk(settings);
	return [...brands];
}

export function createOffersSync(root, { jsonRoot, siteDir }) {
	const collection = 'special-offers';
	const common = path.join(jsonRoot, 'data/content', collection);
	const site = path.join(siteDir, 'content', collection);
	const brands = brandDomains(readJson(path.join(siteDir, 'settings.json'))).map((domain) => ({
		brand: domain.replace(/\.alexsab\.ru$/, ''),
		dir: path.join(jsonRoot, 'src', domain, 'content', collection),
	}));
	const destination = path.join(root, 'src/content', collection);
	const registry = path.join(root, 'src/data/site/pages.json');
	const directories = [common, ...brands.map(({ dir }) => dir), site];
	return {
		// Watch parent content directories too, so creating a missing collection works.
		watchPaths: [...directories.map((dir) => path.dirname(dir)), registry],
		matches: (file) => file === registry || directories.some((dir) => file === dir || file.startsWith(`${dir}${path.sep}`)),
		sync() {
			const layers = brands.map((layer) => ({
				...layer, files: listFiles(layer.dir).map((file) => `${collection}/${file}`),
			}));
			const plan = planContentCopies(buildLayerMap(layers), readJson(registry));
			if (plan.errors.length) throw new Error(plan.errors.join('\n'));
			const sources = new Map(listFiles(common).map((file) => [file, path.join(common, file)]));
			for (const copy of plan.copies) {
				const layer = brands.find(({ brand }) => brand === copy.brand);
				sources.set(copy.target.slice(collection.length + 1), path.join(layer.dir, copy.source.slice(collection.length + 1)));
			}
			for (const file of listFiles(site)) sources.set(file, path.join(site, file));
			// Read everything before changing the destination: a bad source leaves the last working tree intact.
			const contents = new Map([...sources].map(([file, source]) => [file, fs.readFileSync(source)]));
			if (fs.lstatSync(destination, { throwIfNoEntry: false })?.isSymbolicLink()) fs.unlinkSync(destination);
			fs.mkdirSync(destination, { recursive: true });
			for (const file of listFiles(destination)) {
				if (!contents.has(file)) fs.rmSync(path.join(destination, file), { force: true });
			}
			for (const [file, data] of contents) writeLocalFile(path.join(destination, file), data);
			return [...contents.keys()].filter((file) => /\.mdx?$/.test(file)).sort().join('\n');
		},
	};
}

export function detachJsonSource(root) {
	const source = linkedJsonSource(root);
	if (!source) return;
	const banners = path.join(root, 'src/data/site/banners.json');
	if (fs.lstatSync(banners, { throwIfNoEntry: false })?.isSymbolicLink()) {
		writeLocalFile(banners, fs.readFileSync(banners));
	}
	const page = path.join(root, 'src/pages/index.astro');
	if (fs.existsSync(page) && fs.readFileSync(page, 'utf8').includes('Generated by linkJson')) {
		writeLocalFile(page, fs.readFileSync(path.join(source.siteDir, 'pages/index.astro')));
	}
	fs.unlinkSync(sourceLink(root));
}
