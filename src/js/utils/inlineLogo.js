import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { optimize } from 'svgo';

const MAX_BYTES = 128 * 1024;
const remoteHosts = new Set(['cdn.alexsab.ru', 'alexsab.ru']);
const cache = new Map();
const tags = new Set([
	'svg', 'g', 'path', 'defs', 'rect', 'circle', 'ellipse', 'line',
	'polyline', 'polygon', 'text', 'tspan', 'textPath', 'title', 'desc',
	'linearGradient', 'radialGradient', 'stop', 'clipPath', 'mask',
	'pattern', 'symbol', 'use', 'image',
]);
const attributes = new Set([
	'xmlns', 'xmlns:xlink', 'version', 'id', 'class', 'viewBox',
	'width', 'height', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'dx', 'dy',
	'd', 'points', 'cx', 'cy', 'r', 'rx', 'ry', 'transform',
	'fill', 'fill-rule', 'fill-opacity', 'stroke', 'stroke-width',
	'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
	'stroke-dasharray', 'stroke-dashoffset', 'opacity', 'clip-rule', 'clip-path',
	'mask', 'maskUnits', 'maskContentUnits', 'gradientUnits', 'gradientTransform',
	'spreadMethod', 'offset', 'stop-color', 'stop-opacity', 'patternUnits',
	'patternContentUnits', 'patternTransform', 'preserveAspectRatio',
	'href', 'xlink:href', 'color', 'shape-rendering', 'text-rendering',
	'image-rendering', 'font-family', 'font-size', 'font-weight', 'font-style',
	'letter-spacing', 'word-spacing', 'text-anchor', 'dominant-baseline',
	'xml:space', 'display', 'visibility', 'vector-effect',
]);

/** Only passive, self-contained SVG graphics may enter the HTML document. */
export function prepareInlineLogo(svg, { className = '', label = '', prefix = 'logo' } = {}) {
	if (typeof svg !== 'string' || Buffer.byteLength(svg) > MAX_BYTES || /<!DOCTYPE|<!ENTITY/i.test(svg)) return null;
	try {
		const result = optimize(svg, {
			plugins: [
				'removeXMLProcInst', 'removeComments', 'removeMetadata', 'removeEditorsNSData',
				{ name: 'inlineStyles', params: { onlyMatchedOnce: false } },
				'convertStyleToAttrs',
				{ name: 'prefixIds', params: { prefix } },
				{
					name: 'passiveLogo',
					fn: () => ({
						element: {
							enter(node, parent) {
								if (!tags.has(node.name)) throw new Error('Unsupported SVG element');
								for (const [name, value] of Object.entries(node.attributes)) {
									if (name.startsWith('aria-') || name === 'role' || name === 'focusable') {
										delete node.attributes[name];
										continue;
									}
									if (!attributes.has(name)) throw new Error('Unsupported SVG attribute');
									if (name === 'href' || name === 'xlink:href') {
										const embeddedRaster = node.name === 'image' && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/.test(value);
										if (!value.startsWith('#') && !embeddedRaster) throw new Error('External SVG reference');
									}
									if (/url\s*\(/i.test(value) && !/^url\(\s*['"]?#[\w.-]+['"]?\s*\)$/i.test(value)) throw new Error('External SVG paint');
								}
								if (parent.type === 'root') {
									if (node.name !== 'svg') throw new Error('Invalid SVG root');
									if (!node.attributes.viewBox) {
										const width = node.attributes.width || '';
										const height = node.attributes.height || '';
										if (!/^[\d.]+(?:px)?$/.test(width) || !/^[\d.]+(?:px)?$/.test(height) || !(parseFloat(width) > 0 && parseFloat(height) > 0)) throw new Error('Missing SVG dimensions');
										node.attributes.viewBox = `0 0 ${parseFloat(width)} ${parseFloat(height)}`;
									}
									node.attributes.xmlns = 'http://www.w3.org/2000/svg';
									node.attributes.class = className;
									node.attributes.role = 'img';
									node.attributes['aria-label'] = label;
									node.attributes.focusable = 'false';
								}
							},
						},
					}),
				},
			],
		});
		return result.data;
	} catch {
		return null;
	}
}

async function loadSvg(src) {
	try {
		const url = new URL(src, 'https://local.invalid');
		if (!url.pathname.toLowerCase().endsWith('.svg')) return null;
		if (src.startsWith('/') && !src.startsWith('//')) {
			const root = path.resolve('public');
			const file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
			if (!file.startsWith(`${root}${path.sep}`)) return null;
			const data = await readFile(file);
			return data.length <= MAX_BYTES ? data.toString('utf8') : null;
		}
		if (url.protocol !== 'https:' || !remoteHosts.has(url.hostname) || url.username || url.password || (url.port && url.port !== '443')) return null;
		const response = await fetch(url, { signal: AbortSignal.timeout(5000), redirect: 'error' });
		if (!response.ok || Number(response.headers.get('content-length')) > MAX_BYTES) return null;
		const reader = response.body.getReader();
		const chunks = [];
		let length = 0;
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			length += value.length;
			if (length > MAX_BYTES) { await reader.cancel(); return null; }
			chunks.push(Buffer.from(value));
		}
		return Buffer.concat(chunks).toString('utf8');
	} catch {
		return null;
	}
}

export async function getInlineLogo(src, options = {}) {
	if (typeof src !== 'string' || !src) return null;
	if (!cache.has(src)) cache.set(src, loadSvg(src));
	const svg = await cache.get(src);
	if (!svg) return null;
	const prefix = `logo-${createHash('sha256').update(src + (options.instance || '')).digest('hex').slice(0, 12)}`;
	return prepareInlineLogo(svg, { ...options, prefix });
}
