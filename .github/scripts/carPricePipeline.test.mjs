import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const { scripts } = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8'));

for (const command of ['ddlcars', 'ddcars', 'ddlcarsl', 'verifycars', 'verifyrcars']) {
	test(`${command} uses the fresh feed for model prices and page placeholders`, (t) => {
		const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'car-price-pipeline-'));
		t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
		const write = (file, value) => {
			const target = path.join(cwd, file);
			fs.mkdirSync(path.dirname(target), { recursive: true });
			fs.writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value));
		};
		const read = (file) => JSON.parse(fs.readFileSync(path.join(cwd, file), 'utf8'));
		const model = {
			id: 'h3',
			name: 'H3',
			brand: { id: 'haval' },
			price: '{{price-haval-h3}}',
			benefit: '{{benefit-haval-h3}}',
		};
		write('src/data/common/brands/haval/models/h3.json', model);
		write('src/data/common/cars.json', [{ id: 'haval-h3', price: 2549000 }]);
		write('src/data/site/models.json', { models: [model] });
		write('src/data/site/seo.json', { title: 'H3: {{priceb-haval-h3}}' });
		write('src/pages/index.astro', '<p>{{price-haval-h3}}</p>');
		// A previous run must never supply the next build's minimum.
		write('src/data/dealer-models_cars_price.json', [{ brand: 'Haval', model: 'H3', price: 1000000 }]);
		write('bin/pnpm', `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const [command, ...args] = process.argv.slice(2);
const scripts = path.join(process.env.TEST_REPO, '.github/scripts');
switch (command) {
	case 'downloadCommonRepo':
	case 'getAll':
	case 'getDealerPrices':
	case 'getDealerServicePrices':
	case 'dev':
	case 'build':
		break;
	case 'cars':
		if (args[0] !== 'auto') throw new Error('Unexpected feed command');
		// Both producers must finish before prices and placeholders are calculated.
	case 'copyRepoCars':
		fs.writeFileSync('src/data/dealer-models_cars_price.json', JSON.stringify([
			{ brand: 'Haval', model: 'H3', price: 2018610, benefit: 702900 }
		]));
		break;
	case 'mergeCarPrices':
	case 'replacePlaceholdersAndSearchDates':
		execFileSync(process.execPath, [path.join(scripts, command + '.js')], { stdio: 'pipe' });
		break;
	default:
		throw new Error('Unexpected command: ' + command);
}
`);
		fs.chmodSync(path.join(cwd, 'bin/pnpm'), 0o755);
		execFileSync('bash', ['-c', scripts[command]], {
			cwd,
			env: {
				PATH: `${path.join(cwd, 'bin')}${path.delimiter}${process.env.PATH}`,
				TEST_REPO: repo,
				DISABLE_FEED_PRICE: 'false',
				DISABLE_FEED_BENEFIT: 'false',
			},
			timeout: 30000,
		});
		const [price] = read('src/data/site/all-prices.json');
		assert.equal(price.priceDealerAVN, 2018610);
		assert.equal(price.benefitDealerAVN, 702900);
		assert.equal(price.price, 2018610);
		assert.equal(read('src/data/site/models.json').models[0].price, '2018610');
		assert.match(read('src/data/site/seo.json').title, /2\D*018\D*610/);
		assert.match(fs.readFileSync(path.join(cwd, 'src/pages/index.astro'), 'utf8'), /2\D*018\D*610/);
	});
}
