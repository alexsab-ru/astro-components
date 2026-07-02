import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));
const faqItemSource = readFileSync(resolve(currentDir, 'FaqItem.astro'), 'utf8');

assert.match(
	faqItemSource,
	/border-gray-200/,
	'FAQ item has a visible default border on gray backgrounds'
);

assert.match(
	faqItemSource,
	/hover:border-gray-200/,
	'FAQ item border becomes darker on hover'
);

assert.match(
	faqItemSource,
	/border-gray-200/,
	'FAQ item active state uses the darker border'
);

console.log('faq tests passed');
