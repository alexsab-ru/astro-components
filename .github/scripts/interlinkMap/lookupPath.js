/**
 * Показывает, откуда можно попасть на страницу (входящие ссылки + кратчайший путь с /).
 *
 * Использование (после pnpm interlink_map):
 *   node .github/scripts/interlinkMap/lookupPath.js /remont/to/antara/
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const GRAPH = path.join(ROOT, 'tmp/interlink-map/graph.json');

function canonicalPath(url) {
	if (!url.startsWith('/')) url = `/${url}`;
	const lower = url.toLowerCase();
	return lower.endsWith('/') ? lower : `${lower}/`;
}

function shortestPath(from, to, outgoing) {
	const q = [[from, [from]]];
	const visited = new Set([from]);
	while (q.length) {
		const [cur, chain] = q.shift();
		if (cur === to) return chain;
		for (const next of outgoing[cur] ?? []) {
			if (!visited.has(next)) {
				visited.add(next);
				q.push([next, [...chain, next]]);
			}
		}
	}
	return null;
}

const target = canonicalPath(process.argv[2] ?? '');
if (!target || target === '/') {
	console.error('Укажите URL: node lookupPath.js /remont/to/antara/');
	process.exit(1);
}

if (!fs.existsSync(GRAPH)) {
	console.error('Сначала запустите: pnpm interlink_map');
	process.exit(1);
}

const g = JSON.parse(fs.readFileSync(GRAPH, 'utf-8'));
const incoming = (g.incoming?.[target] ?? []).filter((u) => u !== target);
const inMenu = g.menu?.includes(target);
const node = g.nodes?.find((n) => n.id === target);
const pathFromHome = shortestPath('/', target, g.outgoing ?? {});

console.log(`\n🔍 ${target}\n`);
console.log('В меню:', inMenu ? 'да' : 'нет');
if (node) {
	console.log(`Входящих: ${node.incoming}, исходящих: ${node.outgoing}`);
}
console.log('\nКто ссылается (incoming, без самоссылки):');
if (!incoming.length) console.log('  — никто');
else incoming.forEach((u) => console.log(`  ← ${u}`));

console.log('\nКратчайший путь с главной /:');
if (pathFromHome) console.log('  ' + pathFromHome.join(' → '));
else console.log('  — недостижимо с / (только меню или прямой URL)');

console.log('\nВ graph.json смотрите:');
console.log(`  incoming["${target}"]`);
console.log(`  nodes[].id === "${target}"\n`);
