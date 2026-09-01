/**
 * Разрешение столкновений между бренд-слоями при сборке данных сайта.
 *
 * Порядок слоёв — общий → бренды в порядке строки brand → pages-template → дилер.
 * Раньше каждый следующий rsync молча перетирал предыдущий, поэтому побеждал
 * не «лучший», а последний бренд по списку. Здесь столкновение становится
 * либо явным решением из pages.json, либо ошибкой сборки.
 *
 * Три возможных ответа, одинаковых для страниц и для записей коллекций:
 *   "from": null       — копируются все, каждая версия под своим брендовым URL;
 *   "from": "<бренд>"  — копируются все, названный сохраняет голый URL;
 *   "only": "<бренд>"  — копируется одна названная версия, остальные отброшены.
 *
 * Чистые функции: файловых операций нет, они в syncBrandLayers.mjs.
 */

/**
 * Карта «относительный путь файла → бренды, которые его дают».
 * Порядок брендов внутри значения повторяет порядок слоёв.
 */
export function buildLayerMap(layers) {
	const map = new Map();
	for (const layer of layers) {
		for (const file of layer.files) {
			if (!map.has(file)) map.set(file, []);
			map.get(file).push(layer.brand);
		}
	}
	return map;
}

/** about.astro → /about/, about/index.astro → /about/, index.astro → / */
const pageFileToUrl = (file) => {
	const withoutExt = file.replace(/\.astro$/, '');
	if (withoutExt === 'index') return '/';
	const slug = withoutExt.endsWith('/index') ? withoutExt.slice(0, -'/index'.length) : withoutExt;
	return `/${slug}/`;
};

/**
 * Запись реестра по URL. Ключ — сам URL в каноническом виде, поля `url`
 * внутри записи нет; форму ключей гарантирует check:pages-registry.
 */
const findPageEntry = (pages, url) => {
	const entry = pages?.[url];
	return entry !== null && typeof entry === 'object' ? entry : undefined;
};

/**
 * Запись индекса коллекции: сначала по объявленному полю `collection`,
 * затем по каноническому ключу /<collection>/ — коллекцию можно описать
 * и без явного поля, ключ всё равно её адресует.
 */
const findCollectionEntry = (pages, name) => {
	for (const entry of Object.values(pages ?? {})) {
		if (entry !== null && typeof entry === 'object' && entry.collection === name) return entry;
	}
	return findPageEntry(pages, `/${name}/`);
};

/**
 * Выключенный маршрут в dist не попадёт, поэтому требовать решение о том,
 * чего никто не увидит, незачем: сохраняем прежнее «побеждает последний».
 */
const isDisabled = (entry) => entry?.enabled === false;

const lastOf = (list) => list[list.length - 1];

const isBrandName = (value) => typeof value === 'string' && value !== '';

/**
 * Общая часть обоих планировщиков: разбор ответа из реестра.
 * Возвращает либо {kind:'only', brand}, либо {kind:'split', from}, либо {kind:'missing'}.
 */
const readResolution = (resolution) => {
	if (resolution === undefined || resolution === null) return { kind: 'missing' };
	if (isBrandName(resolution.only)) return { kind: 'only', brand: resolution.only };
	if ('from' in resolution && (resolution.from === null || isBrandName(resolution.from))) {
		return { kind: 'split', from: resolution.from };
	}
	return { kind: 'missing' };
};

/**
 * Имя файла страницы с префиксом бренда.
 *
 * Префикс достаётся сегменту, который даёт URL: insurance.astro → vgv-insurance.astro,
 * about/index.astro → vgv-about/index.astro. Дописывать бренд к самому index.astro
 * нельзя — URL берётся из каталога, и /about/vgv-index/ было бы бессмыслицей.
 */
const prefixPageFile = (file, brand) => {
	const segments = file.split('/');
	const isDirectoryIndex = segments[segments.length - 1] === 'index.astro';
	const target = isDirectoryIndex ? segments.length - 2 : segments.length - 1;
	segments[target] = `${brand}-${segments[target]}`;
	return segments.join('/');
};

/**
 * План копирования страниц бренд-слоёв.
 * Столкновение без решения на живом маршруте — ошибка с готовым сниппетом.
 */
export function planPageCopies(layerMap, pages) {
	const copies = [];
	const errors = [];

	for (const [file, brands] of layerMap) {
		if (brands.length === 1) {
			copies.push({ brand: brands[0], source: file, target: file });
			continue;
		}

		const url = pageFileToUrl(file);
		const entry = findPageEntry(pages, url);

		if (isDisabled(entry)) {
			copies.push({ brand: lastOf(brands), source: file, target: file });
			continue;
		}

		const resolution = readResolution(entry);

		if (resolution.kind === 'missing') {
			// Сниппет предлагает нынешнего победителя: вставка варианта "only"
			// как есть закрепляет сегодняшнее поведение и не двигает живой URL.
			errors.push(
				`Столкновение страницы "${file}" между брендами: ${brands.join(', ')}.\n` +
				`   Нужна одна версия — добавьте в pages.json:\n` +
				`     "${url}": { "only": "${lastOf(brands)}" }\n` +
				`   Нужны все, каждая под своим брендовым URL:\n` +
				`     "${url}": { "from": null }`,
			);
			continue;
		}

		if (resolution.kind === 'only') {
			if (!brands.includes(resolution.brand)) {
				errors.push(
					`Столкновение страницы "${file}": в pages.json указан "only": "${resolution.brand}", ` +
					`но этот бренд файл не даёт. Кандидаты: ${brands.join(', ')}.`,
				);
				continue;
			}
			copies.push({ brand: resolution.brand, source: file, target: file });
			continue;
		}

		if (file === 'index.astro') {
			errors.push(
				`Столкновение главной страницы "${file}" между брендами: ${brands.join(', ')}. ` +
				`Главную нельзя разнести по брендам — у сайта одна главная. ` +
				`Укажите "/": { "only": "${lastOf(brands)}" }.`,
			);
			continue;
		}

		if (resolution.from !== null && !brands.includes(resolution.from)) {
			errors.push(
				`Столкновение страницы "${file}": в pages.json указан "from": "${resolution.from}", ` +
				`но этот бренд файл не даёт. Кандидаты: ${brands.join(', ')}.`,
			);
			continue;
		}

		for (const brand of brands) {
			copies.push({
				brand,
				source: file,
				target: brand === resolution.from ? file : prefixPageFile(file, brand),
			});
		}
	}

	return { copies, errors };
}

/** special-offers/trade-in.mdx → { collection: 'special-offers', entry: 'trade-in' } */
const splitContentPath = (file) => {
	const withoutExt = file.replace(/\.(mdx?|markdown)$/, '');
	const slashIndex = withoutExt.indexOf('/');
	if (slashIndex === -1) return undefined;
	return {
		collection: withoutExt.slice(0, slashIndex),
		entry: withoutExt.slice(slashIndex + 1),
	};
};

/**
 * Имя файла записи коллекции с префиксом бренда.
 *
 * Префикс встаёт ПОСЛЕ числа сортировки: 1_warranty.mdx + jetour →
 * 1_jetour-warranty.mdx. Порядок в списке коллекции берётся из числа перед
 * первым «_» (sortingAndFilteringPosts.getFileNumber), и jetour-1_warranty
 * дало бы parseInt('jetour-1') → NaN → 0, забросив запись в начало списка.
 */
const prefixContentFile = (file, brand) => {
	const slashIndex = file.lastIndexOf('/');
	const dir = slashIndex === -1 ? '' : file.slice(0, slashIndex + 1);
	const base = slashIndex === -1 ? file : file.slice(slashIndex + 1);
	const numbered = base.match(/^(\d+_)(.+)$/);
	return numbered ? `${dir}${numbered[1]}${brand}-${numbered[2]}` : `${dir}${brand}-${base}`;
};

/**
 * План копирования контента бренд-слоёв.
 * Ответы те же три, что и для страниц, но живут в блоке entries записи коллекции.
 */
export function planContentCopies(layerMap, pages) {
	const copies = [];
	const errors = [];

	for (const [file, brands] of layerMap) {
		if (brands.length === 1) {
			copies.push({ brand: brands[0], source: file, target: file });
			continue;
		}

		const parts = splitContentPath(file);
		if (!parts) {
			errors.push(
				`Столкновение файла "${file}" между брендами: ${brands.join(', ')}. ` +
				`Файл лежит вне коллекции, автоматическое переименование неприменимо — ` +
				`уберите лишнюю копию из бренд-слоёв.`,
			);
			continue;
		}

		const collectionEntry = findCollectionEntry(pages, parts.collection);

		if (isDisabled(collectionEntry)) {
			copies.push({ brand: lastOf(brands), source: file, target: file });
			continue;
		}

		const resolution = readResolution(collectionEntry?.entries?.[parts.entry]);

		if (resolution.kind === 'missing') {
			errors.push(
				`Столкновение записи "${file}" между брендами: ${brands.join(', ')}.\n` +
				`   Разнести по брендам — добавьте в pages.json:\n` +
				`     "/${parts.collection}/": { "collection": "${parts.collection}",\n` +
				`       "entries": { "${parts.entry}": { "from": null } } }\n` +
				`   Оставить один голый URL за ${lastOf(brands)}: "from": "${lastOf(brands)}".\n` +
				`   Нужна одна версия: "only": "${lastOf(brands)}".`,
			);
			continue;
		}

		if (resolution.kind === 'only') {
			if (!brands.includes(resolution.brand)) {
				errors.push(
					`Столкновение записи "${file}": в entries указан "only": "${resolution.brand}", ` +
					`но этот бренд файл не даёт. Кандидаты: ${brands.join(', ')}.`,
				);
				continue;
			}
			copies.push({ brand: resolution.brand, source: file, target: file });
			continue;
		}

		if (resolution.from !== null && !brands.includes(resolution.from)) {
			errors.push(
				`Столкновение записи "${file}": в entries указан "from": "${resolution.from}", ` +
				`но этот бренд файл не даёт. Кандидаты: ${brands.join(', ')}.`,
			);
			continue;
		}

		for (const brand of brands) {
			copies.push({
				brand,
				source: file,
				target: brand === resolution.from ? file : prefixContentFile(file, brand),
			});
		}
	}

	return { copies, errors };
}