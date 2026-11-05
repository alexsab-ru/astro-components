import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const script = fileURLToPath(new URL('./sh/downloadCommonRepo.sh', import.meta.url));

function fixture(run) {
	const base = fs.mkdtempSync(path.join(os.tmpdir(), 'common-files-'));
	const source = path.join(base, 'source.git');
	const project = path.join(base, 'project');
	const write = (file, text) => {
		fs.mkdirSync(path.dirname(file), { recursive: true });
		fs.writeFileSync(file, text);
	};
	write(path.join(source, 'data/link-checker.json'), '{"version":1,"excludeSites":[],"skip":[]}');
	write(path.join(source, 'data/unrelated.json'), '{"untouched":true}');
	write(path.join(source, 'src/site.test/settings.json'), '{"brand":"fixture"}');
	write(path.join(project, 'src/content/keep.mdx'), 'Keep content');
	write(path.join(project, 'src/data/site/settings.json'), '{"keep":true}');
	write(path.join(project, '.env'), 'SENTINEL=unchanged\n');
	const env = { ...process.env, DOMAIN: '', JSON_REPO: '', ASTRO_JSON_LOCAL: '', FINE_GRAINED_PAT: '' };
	try {
		run({ source, project, env });
		assert.equal(fs.readFileSync(path.join(project, '.env'), 'utf8'), 'SENTINEL=unchanged\n');
		assert.equal(fs.readFileSync(path.join(project, 'src/content/keep.mdx'), 'utf8'), 'Keep content');
		assert.equal(fs.readFileSync(path.join(project, 'src/data/site/settings.json'), 'utf8'), '{"keep":true}');
		assert.equal(fs.existsSync(path.join(project, 'src/data/common/unrelated.json')), false);
	} finally {
		fs.rmSync(base, { recursive: true, force: true });
	}
}

test('common-file selection copies only requested local data without requiring a domain', () => fixture(({ source, project, env }) => {
	execFileSync('bash', [script, '--local-path', source, '-f', 'data/link-checker.json'], { cwd: project, env });
	assert.deepEqual(JSON.parse(fs.readFileSync(path.join(project, 'src/data/common/link-checker.json'))), { version: 1, excludeSites: [], skip: [] });
}));

test('common-file selection checks out only the requested file from a Git source', () => fixture(({ source, project, env }) => {
	const git = (...args) => execFileSync('git', args, { cwd: source, stdio: 'pipe' });
	git('init', '--initial-branch=main');
	git('add', '.');
	git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', '-c', 'commit.gpgsign=false', 'commit', '-m', 'Fixture');
	execFileSync('bash', [script, '-f', 'data/link-checker.json', '--keep-tmp'], { cwd: project, env: { ...env, JSON_REPO: `file://${source}` }, stdio: 'pipe' });
	const checkout = path.join(project, 'tmp/source');
	assert.equal(fs.existsSync(path.join(checkout, 'data/link-checker.json')), true);
	assert.equal(fs.existsSync(path.join(checkout, 'data/unrelated.json')), false);
	assert.equal(fs.existsSync(path.join(checkout, 'src/site.test/settings.json')), false);
	assert.equal(fs.existsSync(path.join(project, 'src/data/common/link-checker.json')), true);
}));

test('missing, traversal and server-only files fail without changing site data', () => fixture(({ source, project, env }) => {
	for (const file of ['data/missing.json', 'data/../private.json', 'data/leads.json']) {
		const result = spawnSync('bash', [script, '--local-path', source, '-f', file], { cwd: project, env, encoding: 'utf8' });
		assert.notEqual(result.status, 0, file);
	}
}));
