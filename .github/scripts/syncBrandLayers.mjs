#!/usr/bin/env node
/**
 * Копирование бренд-слоёв pages/ и content/ с разрешением столкновений.
 *
 * Заменяет слепые rsync-циклы по брендам в downloadCommonRepo.sh. Общий слой,
 * pages-template и дилерский слой копируются там же обычным rsync: у них
 * порядок однозначен, и коллизией их перекрытие не считается.
 *
 * При неразрешённом столкновении не копируется НИЧЕГО и процесс падает:
 * частично собранные данные хуже, чем остановленная сборка.
 *
 * Запуск из bash:
 *   SYNC_KIND=content TMP_DIR=... BRAND_DOMAINS=$'a\nb' TARGET_DIR=... SITE_DATA_DIR=... \
 *     node .github/scripts/syncBrandLayers.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLayerMap, planContentCopies, planPageCopies } from './layerResolution.mjs';

/** Относительные пути всех файлов каталога, рекурсивно и отсортированно. */
export function listFiles(dir) {
	if (!fs.existsSync(dir)) return [];
	const walk = (current, prefix = '') =>
		fs.readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
			const full = path.join(current, entry.name);
			if (entry.isDirectory()) return walk(full, `${prefix}${entry.name}/`);
			return [`${prefix}${entry.name}`];
		});
	return walk(dir).sort();
}

const brandIdFromDomain = (domain) => domain.replace(/\.alexsab\.ru$/, '');

export function syncBrandLayers({ kind, tmpDir, brandDomains, targetDir, pages }) {
	const layers = brandDomains
		.map((domain) => ({
			brand: brandIdFromDomain(domain),
			dir: path.join(tmpDir, 'src', domain, kind === 'pages' ? 'pages' : 'content'),
		}))
		.map((layer) => ({ ...layer, files: listFiles(layer.dir) }))
		.filter((layer) => layer.files.length > 0);

	const layerMap = buildLayerMap(layers);
	const plan = kind === 'pages' ? planPageCopies(layerMap, pages) : planContentCopies(layerMap, pages);

	if (plan.errors.length > 0) return { copied: 0, errors: plan.errors };

	const dirByBrand = new Map(layers.map((layer) => [layer.brand, layer.dir]));
	let copied = 0;
	for (const copy of plan.copies) {
		const source = path.join(dirByBrand.get(copy.brand), copy.source);
		const destination = path.join(targetDir, copy.target);
		fs.mkdirSync(path.dirname(destination), { recursive: true });
		fs.copyFileSync(source, destination);
		copied += 1;
	}

	return { copied, errors: [] };
}

const main = () => {
	const kind = process.env.SYNC_KIND;
	const tmpDir = process.env.TMP_DIR;
	const targetDir = process.env.TARGET_DIR;
	const siteDataDir = process.env.SITE_DATA_DIR;
	const brandDomains = (process.env.BRAND_DOMAINS || '')
		.split('\n')
		.map((value) => value.trim())
		.filter(Boolean);

	if (!kind || !tmpDir || !targetDir) {
		console.error('SYNC_KIND, TMP_DIR и TARGET_DIR обязательны');
		process.exit(1);
	}

	if (brandDomains.length === 0) {
		console.log(`▶ Бренд-слои ${kind}: брендов нет, пропускаем`);
		return;
	}

	let pages = {};
	try {
		pages = JSON.parse(fs.readFileSync(path.join(siteDataDir ?? '', 'pages.json'), 'utf8'));
	} catch {
		pages = {};
	}

	const { copied, errors } = syncBrandLayers({ kind, tmpDir, brandDomains, targetDir, pages });

	if (errors.length > 0) {
		console.error(`\n❌ Столкновения бренд-слоёв (${kind}) — сборка остановлена:\n`);
		for (const error of errors) console.error(`${error}\n`);
		process.exit(1);
	}

	console.log(`  ✔ Бренд-слои ${kind}: скопировано файлов ${copied}`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();