import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCHEMA_ORG_MODES = new Set(['optional', 'required', 'absent']);

function listHtmlFiles(directory) {
	const files = [];

	for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
		const entryPath = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			files.push(...listHtmlFiles(entryPath));
		} else if (entry.isFile() && entry.name.endsWith('.html')) {
			files.push(entryPath);
		}
	}

	return files;
}

function isSchemaOrgScript(attributes) {
	return /\bid\s*=\s*["']schema-org["']/i.test(attributes);
}

function isJsonLdScript(attributes) {
	return /\btype\s*=\s*["']application\/ld\+json["']/i.test(attributes);
}

export function validateJsonLdHtml(
	html,
	location = 'HTML',
	{ schemaOrg = 'optional' } = {},
) {
	if (!SCHEMA_ORG_MODES.has(schemaOrg)) {
		throw new TypeError(`Unknown SchemaOrg presence mode: ${schemaOrg}`);
	}

	const errors = [];
	const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
	let jsonLdCount = 0;
	let schemaOrgCount = 0;

	for (const match of html.matchAll(scriptPattern)) {
		const attributes = match[1];
		const isSchemaOrg = isSchemaOrgScript(attributes);
		const isJsonLd = isJsonLdScript(attributes);

		if (isSchemaOrg) {
			schemaOrgCount += 1;
			if (!isJsonLd) {
				errors.push(
					`${location}: script#schema-org must use type="application/ld+json"`,
				);
			}
		}

		if (!isJsonLd) {
			continue;
		}

		jsonLdCount += 1;
		try {
			JSON.parse(match[2]);
		} catch (error) {
			errors.push(
				`${location}: JSON-LD script ${jsonLdCount} is invalid: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	}

	if (schemaOrgCount > 1) {
		errors.push(
			`${location}: expected at most one script#schema-org, found ${schemaOrgCount}`,
		);
	}

	if (schemaOrg === 'required' && schemaOrgCount === 0) {
		errors.push(`${location}: expected script#schema-org, found none`);
	}

	if (schemaOrg === 'absent' && schemaOrgCount > 0) {
		errors.push(
			`${location}: expected no script#schema-org, found ${schemaOrgCount}`,
		);
	}

	return { errors, jsonLdCount, schemaOrgCount };
}

export function validateJsonLdDist(
	directory,
	{ schemaOrg = 'optional' } = {},
) {
	if (!SCHEMA_ORG_MODES.has(schemaOrg)) {
		throw new TypeError(`Unknown SchemaOrg presence mode: ${schemaOrg}`);
	}

	if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
		return {
			errors: [`Build directory not found: ${directory}`],
			htmlCount: 0,
			jsonLdCount: 0,
			schemaOrgCount: 0,
			htmlWithSchemaOrgCount: 0,
		};
	}

	const htmlFiles = listHtmlFiles(directory);
	const errors = [];
	let jsonLdCount = 0;
	let schemaOrgCount = 0;
	let htmlWithSchemaOrgCount = 0;

	for (const filePath of htmlFiles) {
		const result = validateJsonLdHtml(
			fs.readFileSync(filePath, 'utf8'),
			filePath,
			{ schemaOrg: schemaOrg === 'absent' ? 'absent' : 'optional' },
		);
		errors.push(...result.errors);
		jsonLdCount += result.jsonLdCount;
		schemaOrgCount += result.schemaOrgCount;
		if (result.schemaOrgCount > 0) {
			htmlWithSchemaOrgCount += 1;
		}
	}

	if (schemaOrg === 'required' && schemaOrgCount === 0) {
		errors.push(
			`${directory}: expected at least one script#schema-org, found none`,
		);
	}

	return {
		errors,
		htmlCount: htmlFiles.length,
		jsonLdCount,
		schemaOrgCount,
		htmlWithSchemaOrgCount,
	};
}

export function parseArguments(args) {
	let directory;
	let schemaOrg = 'optional';

	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];

		if (argument === '--schema-org') {
			schemaOrg = args[index + 1];
			index += 1;
		} else if (argument.startsWith('--schema-org=')) {
			schemaOrg = argument.slice('--schema-org='.length);
		} else if (argument.startsWith('-')) {
			throw new TypeError(`Unknown argument: ${argument}`);
		} else if (directory === undefined) {
			directory = argument;
		} else {
			throw new TypeError(`Unexpected argument: ${argument}`);
		}
	}

	if (!SCHEMA_ORG_MODES.has(schemaOrg)) {
		throw new TypeError(
			'--schema-org must be one of: optional, required, absent',
		);
	}

	return {
		directory: path.resolve(directory ?? 'dist'),
		schemaOrg,
	};
}

function main() {
	let options;
	try {
		options = parseArguments(process.argv.slice(2));
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		console.error(
			'Usage: validateSchemaOrgDist.mjs [directory] [--schema-org=optional|required|absent]',
		);
		process.exitCode = 1;
		return;
	}

	const result = validateJsonLdDist(options.directory, {
		schemaOrg: options.schemaOrg,
	});

	if (result.errors.length > 0) {
		console.error(
			`JSON-LD validation failed with ${result.errors.length} error(s):`,
		);
		for (const error of result.errors) {
			console.error(`- ${error}`);
		}
		process.exitCode = 1;
		return;
	}

	console.log(
		`OK: parsed ${result.jsonLdCount} JSON-LD script(s) in ${result.htmlCount} HTML file(s); found ${result.schemaOrgCount} script#schema-org in ${result.htmlWithSchemaOrgCount} file(s) (${options.schemaOrg}).`,
	);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main();
}
