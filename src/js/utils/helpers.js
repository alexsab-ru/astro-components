import { getModelBrandUrlName } from './modelFields.js';

export const calcMinPrice = (price) => {
	var minimum = 0;
	var percent = 25;
	if(price > 1500000){
		percent = 4;
	} else if(price > 1000000){
		percent = 6;
	} else if(price > 500000){
		percent = 8;
	} else if(price > 300000){
		percent = 15;
	} else {
		minimum = 50000;
	}
	return Math.max(0,price-Math.max(price*percent/100,minimum))
};

export const getCookie = (name) => {
	var matches = document.cookie.match(new RegExp(
	"(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
	))
	return matches ? decodeURIComponent(matches[1]) : undefined
}

export const getPair = (openURL = '') => {
	let result = {referer: window.location.origin};
	if(typeof openURL === "object") {
		openURL.search.substring(1).split('&').forEach(function(el){
			var pair = el.split('=');
			result[pair[0]] = pair[1];
		});
	}
	let source = new URL(getCookie('__gtm_campaign_url') ? getCookie('__gtm_campaign_url') : window.location);
	if(source.search !== window.location.search) {
		source.search.substring(1).split('&').forEach(function(el){
			var pair = el.split('=');
			result[pair[0]] = pair[1];
		});
	}
	window.location.search.substring(1).split('&').forEach(function(el){
		var pair = el.split('=');
		result[pair[0]] = pair[1];
	});
	return result;
}

export function quoteEscaper(str) {
	return str.replace(/"/g, '\\"').replace(/\n/g, '<br/>');
}

export function setPrefixModelUrl(model, prefix = false) {
	return prefix ? getModelBrandUrlName(model).replace(/ /g, '-') + '-' + model.id : model.id;
}

const isPlainObject = (value) =>
	value !== null &&
	typeof value === 'object' &&
	!Array.isArray(value);

const normalizeModelBlock = ([blockId, block]) => {
	if (!isPlainObject(block) || block.show === false) {
		return null;
	}

	return {
		...block,
		id: block.id ?? blockId,
		content: isPlainObject(block.content) ? block.content : {},
	};
};

export function getModelBlocks(model = null) {
	const blocks = model?.page?.blocks;

	if (!isPlainObject(blocks)) {
		return [];
	}

	const blockOrder = Array.isArray(model?.page?.blockOrder)
		? model.page.blockOrder
		: Object.keys(blocks);
	const orderedBlockIds = [
		...blockOrder.filter((blockId) => blocks[blockId]),
		...Object.keys(blocks).filter((blockId) => !blockOrder.includes(blockId)),
	];

	return orderedBlockIds
		.map((blockId) => normalizeModelBlock([blockId, blocks[blockId]]))
		.filter(Boolean);
}
