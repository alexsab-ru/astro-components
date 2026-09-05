import { existsSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

export const CONTENT_ROOT = resolve(process.cwd(), 'src/content');
export const CONTENT_EXTENSIONS = ['.md', '.mdx'];
export const SPECIAL_COLLECTIONS = new Set(['cars', 'seo', 'used_cars']);

export const hasContentFiles = (dir: string): boolean => {
	if (!existsSync(dir)) return false;

	for (const dirent of readdirSync(dir, { withFileTypes: true })) {
		const entryPath = join(dir, dirent.name);
		if (dirent.isDirectory() && hasContentFiles(entryPath)) return true;
		if (dirent.isFile() && CONTENT_EXTENSIONS.some((ext) => dirent.name.endsWith(ext))) return true;
	}

	return false;
};

export const hasContentCollection = (collection: string): boolean =>
	hasContentFiles(join(CONTENT_ROOT, collection));

export const getContentEntryIds = (collection: string): string[] => {
	const root = join(CONTENT_ROOT, collection);
	if (!existsSync(root)) return [];

	const collect = (dir: string): string[] =>
		readdirSync(dir, { withFileTypes: true }).flatMap((dirent) => {
			const entryPath = join(dir, dirent.name);
			if (dirent.isDirectory()) return collect(entryPath);
			if (!dirent.isFile()) return [];

			const extension = CONTENT_EXTENSIONS.find((ext) => dirent.name.endsWith(ext));
			if (!extension) return [];

			return relative(root, entryPath).slice(0, -extension.length).split(sep).join('/');
		});

	return collect(root);
};

export const hasContentEntry = (collection: string, id: string): boolean =>
	getContentEntryIds(collection).includes(id);

export const getRegularCollectionNames = (includeEmpty = false): string[] => {
	if (!existsSync(CONTENT_ROOT)) return [];

	return readdirSync(CONTENT_ROOT, { withFileTypes: true })
		.filter((dirent) => dirent.isDirectory())
		.map((dirent) => dirent.name)
		.filter((name) => !name.startsWith('_'))
		.filter((name) => !SPECIAL_COLLECTIONS.has(name))
		.filter((name) => includeEmpty || hasContentCollection(name))
		.sort();
};
