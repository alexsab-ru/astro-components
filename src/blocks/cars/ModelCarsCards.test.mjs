import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const typesSource = readFileSync(resolve(currentDir, 'model-cars-cards.types.ts'), 'utf8');
const cardsSource = readFileSync(resolve(currentDir, 'ModelCarsCards.astro'), 'utf8');

assert.match(
	typesSource,
	/price\?: number;/,
	'ModelCarsCardOverride accepts an optional numeric price'
);

assert.match(
	cardsSource,
	/positiveNumber\(override\?\.price\)/,
	'ModelCarsCards uses the override price when the page sets one'
);

assert.match(
	cardsSource,
	/Math\.min\(\.\.\.priceCandidates\)/,
	'ModelCarsCards still falls back to the min of stock and model prices'
);

console.log('ModelCarsCards tests passed');
