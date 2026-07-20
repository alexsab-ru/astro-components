import { execFileSync } from 'node:child_process';
import {
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	realpathSync,
	renameSync,
	rmSync,
} from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const scriptsPath = path.join(projectRoot, 'src/data/site/scripts.json');
const reposRoot =
	process.env.ASTRO_LOCAL_REPOS_ROOT ??
	'/Users/Alexsab/Documents/GitHub/alexsab-ru';
const collections = ['cars', 'used_cars'];

function fail(message) {
	console.error(`❌ ${message}`);
	process.exit(1);
}

if (!existsSync(scriptsPath)) {
	fail(
		`Не найден файл ${scriptsPath}. Сначала запустите локальную синхронизацию данных.`,
	);
}

let scripts;
try {
	scripts = JSON.parse(readFileSync(scriptsPath, 'utf8'));
} catch (error) {
	fail(`Не удалось прочитать ${scriptsPath}: ${error.message}`);
}

const repoName = scripts.repo;
if (
	typeof repoName !== 'string' ||
	!repoName.trim() ||
	path.basename(repoName) !== repoName
) {
	fail(`Некорректное значение repo в ${scriptsPath}: ${String(repoName)}`);
}

const repoPath = path.join(reposRoot, repoName);
if (!existsSync(repoPath)) {
	fail(`Локальная репа не найдена: ${repoPath}`);
}

let resolvedReposRoot;
let resolvedRepoPath;
try {
	resolvedReposRoot = realpathSync(reposRoot);
	resolvedRepoPath = realpathSync(repoPath);
} catch (error) {
	fail(`Не удалось определить путь к локальной репе: ${error.message}`);
}

if (
	resolvedRepoPath === resolvedReposRoot ||
	!resolvedRepoPath.startsWith(`${resolvedReposRoot}${path.sep}`)
) {
	fail(
		`Репа должна находиться внутри ${resolvedReposRoot}: ${resolvedRepoPath}`,
	);
}

try {
	execFileSync('git', ['-C', resolvedRepoPath, 'rev-parse', '--git-dir'], {
		stdio: 'ignore',
	});
} catch {
	fail(`Папка не является git-репозиторием: ${resolvedRepoPath}`);
}

console.log(`🚗 Берём машины из ${resolvedRepoPath}`);

try {
	execFileSync('git', ['-C', resolvedRepoPath, 'fetch', '--prune'], {
		stdio: 'inherit',
	});
	execFileSync('git', ['-C', resolvedRepoPath, 'pull', '--ff-only'], {
		stdio: 'inherit',
	});
} catch {
	console.warn(
		'⚠️ Не удалось обновить локальную репу. Продолжаем с уже имеющимися файлами.',
	);
}

const sourceContentPath = path.join(resolvedRepoPath, 'src/content');
const targetContentPath = path.join(projectRoot, 'src/content');
let copiedCollections = 0;

mkdirSync(targetContentPath, { recursive: true });

for (const collection of collections) {
	const sourcePath = path.join(sourceContentPath, collection);
	const targetPath = path.join(targetContentPath, collection);

	if (!existsSync(sourcePath)) {
		console.log(
			`ℹ️ ${collection}: коллекции нет в исходной репе, пропускаем`,
		);
		continue;
	}

	const temporaryPath = path.join(
		targetContentPath,
		`.${collection}.repo-copy-${process.pid}`,
	);

	try {
		rmSync(temporaryPath, { recursive: true, force: true });
		cpSync(sourcePath, temporaryPath, { recursive: true });
		rmSync(targetPath, { recursive: true, force: true });
		renameSync(temporaryPath, targetPath);
	} catch (error) {
		rmSync(temporaryPath, { recursive: true, force: true });
		fail(`Не удалось скопировать ${collection}: ${error.message}`);
	}

	copiedCollections += 1;
	console.log(`✅ ${collection}: ${sourcePath} → ${targetPath}`);
}

if (copiedCollections === 0) {
	fail(
		'В исходной репе нет коллекций src/content/cars или src/content/used_cars.',
	);
}
