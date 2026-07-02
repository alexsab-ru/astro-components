import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));
const callbackSource = readFileSync(resolve(currentDir, 'Callback.astro'), 'utf8');
const blockRendererSource = readFileSync(resolve(currentDir, '../../../page-builder/BlockRenderer.astro'), 'utf8');

assert.match(
	callbackSource,
	/showComment\s*=/,
	'Callback exposes a showComment prop'
);

assert.match(
	callbackSource,
	/\{showComment\s*&&/,
	'Callback renders the comment textarea only when showComment is enabled'
);

assert.match(
	blockRendererSource,
	/showComment=\{c\.showComment\}/,
	'BlockRenderer passes showComment from callback block data'
);

assert.match(
	callbackSource,
	/bgImage\?:/,
	'Callback exposes responsive bgImage prop'
);

assert.match(
	callbackSource,
	/bgPosition\?:/,
	'Callback exposes responsive bgPosition prop'
);

assert.match(
	callbackSource,
	/callback-bg-responsive/,
	'Callback uses responsive background CSS'
);

assert.match(
	blockRendererSource,
	/bgImage=\{c\.bgImage\}/,
	'BlockRenderer passes responsive bgImage from callback block data'
);

assert.match(
	blockRendererSource,
	/bgPosition=\{c\.bgPosition\}/,
	'BlockRenderer passes responsive bgPosition from callback block data'
);

console.log('callback tests passed');
