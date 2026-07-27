import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
	parseArguments,
	validateJsonLdDist,
	validateJsonLdHtml,
} from './validateSchemaOrgDist.mjs';

test('parses every JSON-LD script regardless of attribute order', () => {
	const result = validateJsonLdHtml(`
		<script id="first" type="application/ld+json">{"@type":"Thing"}</script>
		<script type='application/ld+json' id='second'>[{"@type":"ItemList"}]</script>
		<script type="module">{"ignored":true}</script>
	`);

	assert.deepEqual(result, {
		errors: [],
		jsonLdCount: 2,
		schemaOrgCount: 0,
	});
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

test('required mode fails when a built site has no script#schema-org', (t) => {
	const directory = fs.mkdtempSync(
		path.join(os.tmpdir(), 'schema-org-required-'),
	);
	t.after(() => fs.rmSync(directory, { recursive: true }));
	fs.writeFileSync(
		path.join(directory, 'index.html'),
		'<script type="application/ld+json">{"@type":"Thing"}</script>',
	);

	const result = validateJsonLdDist(directory, {
		schemaOrg: 'required',
	});

	assert.equal(result.jsonLdCount, 1);
	assert.equal(result.schemaOrgCount, 0);
	assert.equal(result.errors.length, 1);
	assert.match(result.errors[0], /expected at least one script#schema-org/);
});

test('absent mode fails when a control build contains script#schema-org', (t) => {
	const directory = fs.mkdtempSync(
		path.join(os.tmpdir(), 'schema-org-absent-'),
	);
	t.after(() => fs.rmSync(directory, { recursive: true }));
	fs.writeFileSync(
		path.join(directory, 'index.html'),
		'<script id="schema-org" type="application/ld+json">[]</script>',
	);

	const result = validateJsonLdDist(directory, {
		schemaOrg: 'absent',
	});

	assert.equal(result.schemaOrgCount, 1);
	assert.equal(result.errors.length, 1);
	assert.match(result.errors[0], /expected no script#schema-org/);
});

test('rejects duplicate script#schema-org ids in one HTML page', () => {
	const result = validateJsonLdHtml(
		[
			'<script id="schema-org" type="application/ld+json">[]</script>',
			'<script type="application/ld+json" id="schema-org">[]</script>',
		].join(''),
		'duplicate.html',
	);

	assert.equal(result.jsonLdCount, 2);
	assert.equal(result.schemaOrgCount, 2);
	assert.equal(result.errors.length, 1);
	assert.match(
		result.errors[0],
		/duplicate\.html: expected at most one script#schema-org, found 2/,
	);
});

test('parses explicit CLI presence modes and rejects unknown values', () => {
	assert.deepEqual(parseArguments(['build', '--schema-org=required']), {
		directory: path.resolve('build'),
		schemaOrg: 'required',
	});
	assert.deepEqual(parseArguments(['--schema-org', 'absent']), {
		directory: path.resolve('dist'),
		schemaOrg: 'absent',
	});
	assert.throws(
		() => parseArguments(['--schema-org=unexpected']),
		/optional, required, absent/,
	);
});
