import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));
const latestPostsSource = readFileSync(
	resolve(currentDir, 'LatestPosts.astro'),
	'utf8'
);

assert.match(
	latestPostsSource,
	/isLink\?: boolean;/,
	'LatestPosts accepts an optional isLink parameter'
);

assert.match(
	latestPostsSource,
	/isLink = true,/,
	'LatestPosts keeps post links enabled by default'
);

assert.match(
	latestPostsSource,
	/<PostItem post=\{post\} isLink=\{isLink\} \/>/,
	'LatestPosts passes isLink through to every PostItem'
);

console.log('latest posts tests passed');
