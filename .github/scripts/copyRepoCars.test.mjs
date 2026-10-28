import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./copyRepoCars.mjs', import.meta.url));
const pricesFile = 'src/data/dealer-models_cars_price.json';
const freshPrices = [{ brand: 'Haval', model: 'H3', price: 2018610, benefit: 728510 }];
const stalePrices = [{ brand: 'Haval', model: 'H3', price: 1000000, benefit: 0 }];

for (const source of ['canonical', 'legacy', 'missing', 'empty']) {
	test(`copyRepoCars keeps cards and prices together: ${source}`, (t) => {
		const base = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-repo-cars-'));
		t.after(() => fs.rmSync(base, { recursive: true, force: true }));
		const cwd = path.join(base, 'template project');
		const reposRoot = path.join(base, 'dealer repos');
		const repo = path.join(reposRoot, 'fixture');
		const write = (root, file, value) => {
			const target = path.join(root, file);
			fs.mkdirSync(path.dirname(target), { recursive: true });
			fs.writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value));
		};
		const env = {
			...process.env,
			ASTRO_LOCAL_REPOS_ROOT: reposRoot,
			GIT_CONFIG_NOSYSTEM: '1',
			GIT_CONFIG_GLOBAL: os.devNull,
		};
		write(cwd, 'src/data/site/scripts.json', { repo: 'fixture' });
		write(cwd, pricesFile, stalePrices);
		write(cwd, 'src/data/site/keep.json', { unrelated: true });
		write(cwd, 'src/content/cars/old.mdx', 'old card');
		write(repo, 'src/content/cars/h3.mdx', 'H3 card');
		write(repo, 'src/content/used_cars/used.mdx', 'used card');
		execFileSync('git', ['init', '--quiet', repo], { env });
		if (source === 'canonical' || source === 'empty') {
			write(repo, pricesFile, source === 'empty' ? [] : freshPrices);
			// The canonical file takes priority over a stale legacy copy.
			write(repo, 'src/data/site/dealer-models_cars_price.json', stalePrices);
		} else if (source === 'legacy') {
			write(repo, 'src/data/site/dealer-models_cars_price.json', freshPrices);
		}
		execFileSync(process.execPath, [script], { cwd, env, timeout: 10000 });
		assert.equal(fs.readFileSync(path.join(cwd, 'src/content/cars/h3.mdx'), 'utf8'), 'H3 card');
		assert.equal(fs.readFileSync(path.join(cwd, 'src/content/used_cars/used.mdx'), 'utf8'), 'used card');
		assert.equal(fs.existsSync(path.join(cwd, 'src/content/cars/old.mdx')), false);
		assert.deepEqual(JSON.parse(fs.readFileSync(path.join(cwd, 'src/data/site/keep.json'))), { unrelated: true });
		if (source === 'missing') {
			assert.equal(fs.existsSync(path.join(cwd, pricesFile)), false);
		} else {
			const expected = source === 'empty' ? [] : freshPrices;
			assert.deepEqual(JSON.parse(fs.readFileSync(path.join(cwd, pricesFile))), expected);
		}
		if (source === 'canonical') {
			assert.deepEqual(JSON.parse(fs.readFileSync(path.join(repo, pricesFile))), freshPrices);
		}
	});
}
