import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLayerMap, planContentCopies, planPageCopies } from './layerResolution.mjs';

const PAGES = {
	'/': {title: 'Главная', only: 'tank'},
	'/about/': {title: 'О компании', enabled: true, sitemap: true, only: 'wey'},
	'/insurance/': {enabled: true, sitemap: true, from: null},
	'/manuals/': {enabled: true, sitemap: true, from: 'wey'},
	'/archive/': {enabled: false},
	'/nested/': {enabled: true, from: null},
	'/special-offers/': {
		enabled: true,
		sitemap: true,
		collection: 'special-offers',
		entries: {'trade-in': {from: 'belgee'}, credit: {from: null}, promo: {only: 'tenet'}},
	},
	'/for-owners/': {
		enabled: true,
		sitemap: true,
		collection: 'for-owners',
		entries: {'1_warranty': {from: 'solaris'}},
	},
	'/legacy/': {enabled: false, collection: 'legacy'},
};

test('buildLayerMap сохраняет порядок брендов', () => {
	const map = buildLayerMap([
		{brand: 'gac', files: ['about.astro']},
		{brand: 'jetour', files: ['about.astro', 'insurance.astro']},
	]);
	assert.deepEqual(map.get('about.astro'), ['gac', 'jetour']);
	assert.deepEqual(map.get('insurance.astro'), ['jetour']);
});

test('страница от одного бренда копируется как есть', () => {
	const map = buildLayerMap([{brand: 'jetour', files: ['whatever.astro']}]);
	const {copies, errors} = planPageCopies(map, PAGES);
	assert.deepEqual(errors, []);
	assert.deepEqual(copies, [{brand: 'jetour', source: 'whatever.astro', target: 'whatever.astro'}]);
});

test('коллизия страниц без решения — ошибка с обоими вариантами', () => {
	const map = buildLayerMap([
		{brand: 'gac', files: ['contacts.astro']},
		{brand: 'jetour', files: ['contacts.astro']},
	]);
	const {copies, errors} = planPageCopies(map, PAGES);
	assert.deepEqual(copies, []);
	assert.equal(errors.length, 1);
	assert.match(errors[0], /contacts\.astro/);
	assert.match(errors[0], /"\/contacts\/"/);
	assert.match(errors[0], /"only": "jetour"/);
	assert.match(errors[0], /"from": null/);
});

test('only — копируется только названная версия', () => {
	const map = buildLayerMap([
		{brand: 'gac', files: ['about.astro']},
		{brand: 'wey', files: ['about.astro']},
	]);
	const {copies, errors} = planPageCopies(map, PAGES);
	assert.deepEqual(errors, []);
	assert.deepEqual(copies, [{brand: 'wey', source: 'about.astro', target: 'about.astro'}]);
});

test('only называет бренд, которого нет среди кандидатов — ошибка', () => {
	const map = buildLayerMap([
		{brand: 'gac', files: ['about.astro']},
		{brand: 'omoda', files: ['about.astro']},
	]);
	const {errors} = planPageCopies(map, PAGES);
	assert.equal(errors.length, 1);
	assert.match(errors[0], /wey/);
});

test('from: null для страниц — каждый бренд получает свой URL', () => {
	const map = buildLayerMap([
		{brand: 'jetour', files: ['insurance.astro']},
		{brand: 'vgv', files: ['insurance.astro']},
	]);
	const {copies, errors} = planPageCopies(map, PAGES);
	assert.deepEqual(errors, []);
	assert.deepEqual(copies.map((copy) => copy.target), [
		'jetour-insurance.astro',
		'vgv-insurance.astro',
	]);
});

test('from: <бренд> для страниц — названный сохраняет URL, остальные с префиксом', () => {
	const map = buildLayerMap([
		{brand: 'livan', files: ['manuals.astro']},
		{brand: 'vgv', files: ['manuals.astro']},
		{brand: 'wey', files: ['manuals.astro']},
	]);
	const {copies, errors} = planPageCopies(map, PAGES);
	assert.deepEqual(errors, []);
	assert.deepEqual(copies.map((copy) => copy.target), [
		'livan-manuals.astro',
		'vgv-manuals.astro',
		'manuals.astro',
	]);
});

test('index.astro в каталоге: префикс достаётся каталогу', () => {
	const map = buildLayerMap([
		{brand: 'gac', files: ['nested/index.astro']},
		{brand: 'jetour', files: ['nested/index.astro']},
	]);
	const {copies, errors} = planPageCopies(map, PAGES);
	assert.deepEqual(errors, []);
	assert.deepEqual(copies.map((copy) => copy.target), [
		'gac-nested/index.astro',
		'jetour-nested/index.astro',
	]);
});

test('корневой index.astro сопоставляется с ключом "/"', () => {
	const map = buildLayerMap([
		{brand: 'geely', files: ['index.astro']},
		{brand: 'tank', files: ['index.astro']},
	]);
	const {copies, errors} = planPageCopies(map, PAGES);
	assert.deepEqual(errors, []);
	assert.deepEqual(copies, [{brand: 'tank', source: 'index.astro', target: 'index.astro'}]);
});

test('главную нельзя разнести по брендам', () => {
	const map = buildLayerMap([
		{brand: 'geely', files: ['index.astro']},
		{brand: 'tank', files: ['index.astro']},
	]);
	const {copies, errors} = planPageCopies(map, {'/': {from: null}});
	assert.deepEqual(copies, []);
	assert.equal(errors.length, 1);
	assert.match(errors[0], /главн/i);
	assert.match(errors[0], /"only"/);
});

test('выключенная страница не требует решения — молча побеждает последний', () => {
	const map = buildLayerMap([
		{brand: 'gac', files: ['archive.astro']},
		{brand: 'jetour', files: ['archive.astro']},
	]);
	const {copies, errors} = planPageCopies(map, PAGES);
	assert.deepEqual(errors, []);
	assert.deepEqual(copies, [{brand: 'jetour', source: 'archive.astro', target: 'archive.astro'}]);
});

test('запись коллекции от одного бренда копируется как есть', () => {
	const map = buildLayerMap([{brand: 'belgee', files: ['special-offers/leasing.mdx']}]);
	const {copies, errors} = planContentCopies(map, PAGES);
	assert.deepEqual(errors, []);
	assert.deepEqual(copies, [{
		brand: 'belgee',
		source: 'special-offers/leasing.mdx',
		target: 'special-offers/leasing.mdx',
	}]);
});

test('первопроходец сохраняет имя, остальные получают префикс', () => {
	const map = buildLayerMap([
		{brand: 'belgee', files: ['special-offers/trade-in.mdx']},
		{brand: 'jetour', files: ['special-offers/trade-in.mdx']},
		{brand: 'livan', files: ['special-offers/trade-in.mdx']},
	]);
	const {copies, errors} = planContentCopies(map, PAGES);
	assert.deepEqual(errors, []);
	assert.deepEqual(copies, [
		{brand: 'belgee', source: 'special-offers/trade-in.mdx', target: 'special-offers/trade-in.mdx'},
		{brand: 'jetour', source: 'special-offers/trade-in.mdx', target: 'special-offers/jetour-trade-in.mdx'},
		{brand: 'livan', source: 'special-offers/trade-in.mdx', target: 'special-offers/livan-trade-in.mdx'},
	]);
});

test('числовой префикс сортировки остаётся первым при переименовании', () => {
	const map = buildLayerMap([
		{brand: 'jetour', files: ['for-owners/1_warranty.mdx']},
		{brand: 'solaris', files: ['for-owners/1_warranty.mdx']},
	]);
	const {copies, errors} = planContentCopies(map, PAGES);
	assert.deepEqual(errors, []);
	assert.deepEqual(copies.map((copy) => copy.target), [
		'for-owners/1_jetour-warranty.mdx',
		'for-owners/1_warranty.mdx',
	]);
});

test('from: null — префикс получают все', () => {
	const map = buildLayerMap([
		{brand: 'jetour', files: ['special-offers/credit.mdx']},
		{brand: 'tenet', files: ['special-offers/credit.mdx']},
	]);
	const {copies, errors} = planContentCopies(map, PAGES);
	assert.deepEqual(errors, []);
	assert.deepEqual(copies.map((copy) => copy.target), [
		'special-offers/jetour-credit.mdx',
		'special-offers/tenet-credit.mdx',
	]);
});

test('only для записи коллекции — копируется только названная', () => {
	const map = buildLayerMap([
		{brand: 'jetour', files: ['special-offers/promo.mdx']},
		{brand: 'tenet', files: ['special-offers/promo.mdx']},
	]);
	const {copies, errors} = planContentCopies(map, PAGES);
	assert.deepEqual(errors, []);
	assert.deepEqual(copies, [{
		brand: 'tenet',
		source: 'special-offers/promo.mdx',
		target: 'special-offers/promo.mdx',
	}]);
});

test('коллизия контента без записи — ошибка с готовым сниппетом', () => {
	const map = buildLayerMap([
		{brand: 'jetour', files: ['manuals-doc/1_pdf.mdx']},
		{brand: 'solaris', files: ['manuals-doc/1_pdf.mdx']},
	]);
	const {copies, errors} = planContentCopies(map, PAGES);
	assert.deepEqual(copies, []);
	assert.equal(errors.length, 1);
	assert.match(errors[0], /manuals-doc/);
	assert.match(errors[0], /1_pdf/);
	assert.match(errors[0], /"entries"/);
	assert.match(errors[0], /"\/manuals-doc\/"/);
});

test('запись коллекции находится по каноническому ключу без поля collection', () => {
	const pages = {'/docs/': {enabled: true, entries: {'1_pdf': {from: 'solaris'}}}};
	const map = buildLayerMap([
		{brand: 'jetour', files: ['docs/1_pdf.mdx']},
		{brand: 'solaris', files: ['docs/1_pdf.mdx']},
	]);
	const {copies, errors} = planContentCopies(map, pages);
	assert.deepEqual(errors, []);
	assert.deepEqual(copies.map((copy) => copy.target), [
		'docs/1_jetour-pdf.mdx',
		'docs/1_pdf.mdx',
	]);
});

test('выключенная коллекция не требует решения — молча побеждает последний', () => {
	const map = buildLayerMap([
		{brand: 'jetour', files: ['legacy/note.mdx']},
		{brand: 'solaris', files: ['legacy/note.mdx']},
	]);
	const {copies, errors} = planContentCopies(map, PAGES);
	assert.deepEqual(errors, []);
	assert.deepEqual(copies, [{brand: 'solaris', source: 'legacy/note.mdx', target: 'legacy/note.mdx'}]);
});

test('вложенная запись переименовывается по базовому имени', () => {
	const pages = {
		'/for-owners/': {
			enabled: true, collection: 'for-owners',
			entries: {'kia/warranty': {from: 'solaris'}},
		},
	};
	const map = buildLayerMap([
		{brand: 'jetour', files: ['for-owners/kia/warranty.mdx']},
		{brand: 'solaris', files: ['for-owners/kia/warranty.mdx']},
	]);
	const {copies, errors} = planContentCopies(map, pages);
	assert.deepEqual(errors, []);
	assert.deepEqual(copies.map((copy) => copy.target), [
		'for-owners/kia/jetour-warranty.mdx',
		'for-owners/kia/warranty.mdx',
	]);
});

test('файлы вне коллекции при коллизии — ошибка, а не молчаливая перезапись', () => {
	const map = buildLayerMap([
		{brand: 'gac', files: ['loose.mdx']},
		{brand: 'jetour', files: ['loose.mdx']},
	]);
	const {errors} = planContentCopies(map, PAGES);
	assert.equal(errors.length, 1);
	assert.match(errors[0], /loose\.mdx/);
});