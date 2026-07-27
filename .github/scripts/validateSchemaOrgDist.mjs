import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

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

export function validateJsonLdHtml(html, location = 'HTML') {
	const errors = [];
	const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
	let jsonLdCount = 0;

	for (const match of html.matchAll(scriptPattern)) {
		if (
			!/\btype\s*=\s*["']application\/ld\+json["']/i.test(match[1])
		) {
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

	return { errors, jsonLdCount };
}

export function validateJsonLdDist(directory) {
	if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
		return {
			errors: [`Build directory not found: ${directory}`],
			htmlCount: 0,
			jsonLdCount: 0,
		};
	}

	const htmlFiles = listHtmlFiles(directory);
	const errors = [];
	let jsonLdCount = 0;

	for (const filePath of htmlFiles) {
		const result = validateJsonLdHtml(
			fs.readFileSync(filePath, 'utf8'),
			filePath,
		);
		errors.push(...result.errors);
		jsonLdCount += result.jsonLdCount;
	}

	return { errors, htmlCount: htmlFiles.length, jsonLdCount };
}

function main() {
	const directory = path.resolve(process.argv[2] ?? 'dist');
	const result = validateJsonLdDist(directory);

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
		`OK: parsed ${result.jsonLdCount} JSON-LD script(s) in ${result.htmlCount} HTML file(s).`,
	);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main();
}
