import assert from 'node:assert/strict';
import test from 'node:test';
import { validateJsonLdHtml } from './validateSchemaOrgDist.mjs';

test('parses every JSON-LD script regardless of attribute order', () => {
	const result = validateJsonLdHtml(`
		<script id="first" type="application/ld+json">{"@type":"Thing"}</script>
		<script type='application/ld+json' id='second'>[{"@type":"ItemList"}]</script>
		<script type="module">{"ignored":true}</script>
	`);

	assert.deepEqual(result, { errors: [], jsonLdCount: 2 });
});

test('reports malformed JSON-LD with its script position', () => {
	const result = validateJsonLdHtml(
		'<script type="application/ld+json">{"broken":}</script>',
		'page.html',
	);

	assert.equal(result.jsonLdCount, 1);
	assert.equal(result.errors.length, 1);
	assert.match(result.errors[0], /page\.html: JSON-LD script 1 is invalid/);
});
