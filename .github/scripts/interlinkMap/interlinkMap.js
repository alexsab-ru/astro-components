/**
 * Карта перелинковки текущей сборки astro-components.
 *
 * 1. Собирает все URL из исходников (pages + content + routes.json)
 * 2. Парсит menu.json и footer legal links
 * 3. Загружает каждую страницу с dev/preview сервера и извлекает href
 * 4. Строит граф «кто на кого ссылается» и находит «сирот»
 *
 * Запуск:
 *   pnpm interlink_map                          # http://127.0.0.1:4321
 *   pnpm interlink_map -- --base http://127.0.0.1:4343
 *   pnpm interlink_map -- --from-dist            # парсить dist/ вместо fetch
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

import {
	collectAllRoutes,
	collectFooterUrls,
	collectMenuUrls,
	normalizeUrl,
} from './collectRoutes.js';

dotenv.config();

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'tmp/interlink-map');
const CONCURRENCY = 8;
const FETCH_TIMEOUT_MS = 15000;

/** Извлекает внутренние href из HTML */
function extractLinksFromHtml(html, baseOrigin) {
	const links = new Set();
	// href="..." и href='...'
	const re = /\shref=["']([^"'#]+(?:#[^"']*)?)["']/gi;
	let m;
	while ((m = re.exec(html)) !== null) {
		const normalized = normalizeUrl(m[1], baseOrigin);
		if (normalized) links.add(normalized);
	}
	return links;
}

/** Параллельный map с ограничением concurrency */
async function mapPool(items, fn, concurrency) {
	const results = new Array(items.length);
	let idx = 0;

	async function worker() {
		while (idx < items.length) {
			const i = idx++;
			results[i] = await fn(items[i], i);
		}
	}

	await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
	return results;
}

/** Загрузка HTML страницы */
async function fetchPage(url, baseOrigin) {
	const fullUrl = `${baseOrigin}${url === '/' ? '/' : url}`;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		const res = await fetch(fullUrl, {
			signal: controller.signal,
			headers: { Accept: 'text/html' },
			redirect: 'follow',
		});
		const html = await res.text();
		return {
			url,
			status: res.status,
			ok: res.ok,
			links: extractLinksFromHtml(html, baseOrigin),
			error: null,
		};
	} catch (err) {
		return {
			url,
			status: 0,
			ok: false,
			links: new Set(),
			error: err.message,
		};
	} finally {
		clearTimeout(timer);
	}
}

/** Парсинг HTML из dist/ */
function readPageFromDist(url) {
	// / → dist/index.html, /about/ → dist/about/index.html
	const rel = url === '/' ? 'index.html' : `${url.replace(/^\//, '').replace(/\/$/, '')}/index.html`;
	const filePath = path.join(ROOT, 'dist', rel);
	if (!fs.existsSync(filePath)) {
		return { ok: false, status: 404, html: '', error: 'file not found' };
	}
	return { ok: true, status: 200, html: fs.readFileSync(filePath, 'utf-8'), error: null };
}

/** BFS-обход от главной — что реально достижимо по ссылкам */
function bfsReachable(startUrl, outgoing) {
	const visited = new Set([startUrl]);
	const queue = [startUrl];

	while (queue.length) {
		const current = queue.shift();
		const targets = outgoing.get(current);
		if (!targets) continue;
		for (const t of targets) {
			if (!visited.has(t)) {
				visited.add(t);
				queue.push(t);
			}
		}
	}
	return visited;
}

function parseArgs(argv) {
	const args = { base: 'http://127.0.0.1:4321', fromDist: false };
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--base' && argv[i + 1]) args.base = argv[++i];
		if (argv[i] === '--from-dist') args.fromDist = true;
	}
	return args;
}

function buildHtmlReport(data) {
	const { domain, generatedAt, stats, orphans, menuOnly, edges, nodes } = data;

	const nodesJson = JSON.stringify(nodes);
	const edgesJson = JSON.stringify(edges);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Карта перелинковки — ${domain}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; background: #0f1117; color: #e6edf3; }
    header { padding: 1rem 1.5rem; border-bottom: 1px solid #30363d; background: #161b22; }
    h1 { margin: 0 0 .25rem; font-size: 1.25rem; }
    .meta { color: #8b949e; font-size: .875rem; }
    .layout { display: grid; grid-template-columns: 360px 1fr; height: calc(100vh - 72px); }
    aside { overflow: auto; border-right: 1px solid #30363d; padding: 1rem; }
    main { position: relative; }
    #graph { width: 100%; height: 100%; }
    .stat { display: flex; justify-content: space-between; padding: .35rem 0; border-bottom: 1px solid #21262d; font-size: .875rem; }
    section { margin-bottom: 1.25rem; }
    section h2 { font-size: .9rem; text-transform: uppercase; letter-spacing: .05em; color: #8b949e; margin: 0 0 .5rem; }
    .orphan { font-size: .8rem; padding: .2rem 0; word-break: break-all; }
    .orphan a { color: #58a6ff; text-decoration: none; }
    .tag { display: inline-block; font-size: .65rem; padding: .1rem .35rem; border-radius: 3px; margin-left: .25rem; }
    .tag-menu { background: #238636; color: #fff; }
    .tag-none { background: #da3633; color: #fff; }
    .tooltip { position: absolute; pointer-events: none; background: #161b22; border: 1px solid #30363d; padding: .5rem .75rem; border-radius: 6px; font-size: .75rem; display: none; z-index: 10; max-width: 280px; }
  </style>
</head>
<body>
  <header>
    <h1>Карта перелинковки: ${domain}</h1>
    <div class="meta">Сгенерировано: ${generatedAt} · ${stats.totalPages} страниц · ${stats.totalEdges} ссылок</div>
  </header>
  <div class="layout">
    <aside>
      <section>
        <h2>Статистика</h2>
        <div class="stat"><span>В меню</span><strong>${stats.inMenu}</strong></div>
        <div class="stat"><span>В footer (legal)</span><strong>${stats.inFooter}</strong></div>
        <div class="stat"><span>Достижимо с /</span><strong>${stats.reachableFromHome}</strong></div>
        <div class="stat"><span>Без входящих ссылок</span><strong style="color:#f85149">${stats.noIncoming}</strong></div>
        <div class="stat"><span>Не в меню и без входящих</span><strong style="color:#f85149">${stats.trueOrphans}</strong></div>
        <div class="stat"><span>Ошибки загрузки</span><strong>${stats.fetchErrors}</strong></div>
      </section>
      <section>
        <h2>Сироты (не в меню, 0 входящих)</h2>
        ${orphans.length === 0 ? '<p style="color:#3fb950;font-size:.875rem">Не найдено 🎉</p>' : orphans.map((o) => `<div class="orphan"><a href="${o.url}" target="_blank">${o.url}</a><span class="tag tag-none">orphan</span><br><small style="color:#8b949e">${o.source ?? ''}</small></div>`).join('')}
      </section>
      <section>
        <h2>Только меню (нет входящих с других страниц)</h2>
        ${menuOnly.slice(0, 30).map((u) => `<div class="orphan"><a href="${u}" target="_blank">${u}</a><span class="tag tag-menu">menu</span></div>`).join('')}
        ${menuOnly.length > 30 ? `<p style="color:#8b949e;font-size:.75rem">…ещё ${menuOnly.length - 30}</p>` : ''}
      </section>
    </aside>
    <main>
      <svg id="graph"></svg>
      <div class="tooltip" id="tooltip"></div>
    </main>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>
  <script>
    const nodes = ${nodesJson};
    const edges = ${edgesJson};
    const svg = d3.select('#graph');
    const tooltip = document.getElementById('tooltip');
    const width = () => svg.node().clientWidth;
    const height = () => svg.node().clientHeight;

    const g = svg.append('g');
    svg.call(d3.zoom().scaleExtent([0.1, 4]).on('zoom', (e) => g.attr('transform', e.transform)));

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(width() / 2, height() / 2))
      .force('collision', d3.forceCollide(18));

    const link = g.append('g').selectAll('line').data(edges).join('line')
      .attr('stroke', '#30363d').attr('stroke-width', 1);

    const node = g.append('g').selectAll('circle').data(nodes).join('circle')
      .attr('r', d => d.orphan ? 7 : 5)
      .attr('fill', d => d.orphan ? '#f85149' : d.inMenu ? '#3fb950' : '#58a6ff')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }))
      .on('mouseover', (e, d) => {
        tooltip.style.display = 'block';
        tooltip.innerHTML = '<strong>' + d.id + '</strong><br>входящих: ' + d.incoming + '<br>исходящих: ' + d.outgoing + (d.inMenu ? '<br>✓ меню' : '') + (d.orphan ? '<br>⚠ сирота' : '');
      })
      .on('mousemove', (e) => { tooltip.style.left = (e.pageX + 12) + 'px'; tooltip.style.top = (e.pageY + 12) + 'px'; })
      .on('mouseout', () => { tooltip.style.display = 'none'; });

    simulation.on('tick', () => {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('cx', d => d.x).attr('cy', d => d.y);
    });

    window.addEventListener('resize', () => {
      simulation.force('center', d3.forceCenter(width() / 2, height() / 2));
      simulation.alpha(0.3).restart();
    });
  </script>
</body>
</html>`;
}

function buildMarkdownReport(data) {
	const lines = [
		`# Карта перелинковки: ${data.domain}`,
		'',
		`Сгенерировано: ${data.generatedAt}`,
		`База: ${data.baseOrigin}`,
		'',
		'## Статистика',
		'',
		`| Метрика | Значение |`,
		`| --- | --- |`,
		`| Всего страниц | ${data.stats.totalPages} |`,
		`| В меню | ${data.stats.inMenu} |`,
		`| Достижимо с главной | ${data.stats.reachableFromHome} |`,
		`| Без входящих ссылок | ${data.stats.noIncoming} |`,
		`| **Сироты** (не в меню + 0 входящих) | **${data.stats.trueOrphans}** |`,
		`| Слабая связь (1 входящая, не меню) | ${data.stats.weakLinks} |`,
		`| Недостижимо с главной / | ${data.stats.unreachableFromHome} |`,
		`| Ошибки загрузки | ${data.stats.fetchErrors} |`,
		'',
	];

	if (data.orphans.length) {
		lines.push('## Сироты — не в меню и ни с одной страницы не ссылаются', '');
		for (const o of data.orphans) {
			lines.push(`- \`${o.url}\` — ${o.source ?? ''}`);
		}
		lines.push('');
	}

	if (data.noIncoming.length) {
		lines.push('## Без входящих (но могут быть в меню)', '');
		for (const o of data.noIncoming) {
			const tags = [o.inMenu && 'menu', o.inFooter && 'footer'].filter(Boolean).join(', ') || '—';
			lines.push(`- \`${o.url}\` [${tags}]`);
		}
		lines.push('');
	}

	if (data.weakLinks?.length) {
		lines.push('## Слабая перелинковка (ровно 1 входящая ссылка, не в меню)', '');
		lines.push('Эти страницы технически связаны, но потеря одной ссылки отрежет их от сайта.', '');
		for (const o of data.weakLinks.slice(0, 50)) {
			lines.push(`- \`${o.url}\``);
		}
		if (data.weakLinks.length > 50) lines.push(`- …ещё ${data.weakLinks.length - 50}`);
		lines.push('');
	}

	if (data.unreachableFromHome?.length) {
		lines.push('## Недостижимо с главной страницы', '');
		lines.push('Не найдено BFS-обходом от `/` — пользователь без прямой ссылки или меню не доберётся.', '');
		const bySection = {};
		for (const p of data.unreachableFromHome) {
			const sec = p.url.split('/').filter(Boolean).slice(0, 2).join('/') || '(root)';
			(bySection[sec] ??= []).push(p.url);
		}
		for (const [sec, urls] of Object.entries(bySection).sort((a, b) => b[1].length - a[1].length)) {
			lines.push(`### /${sec}/ (${urls.length})`, '');
			for (const u of urls.slice(0, 8)) lines.push(`- \`${u}\``);
			if (urls.length > 8) lines.push(`- …ещё ${urls.length - 8}`);
			lines.push('');
		}
	}

	if (data.fetchErrors.length) {
		lines.push('## Ошибки загрузки', '');
		for (const e of data.fetchErrors) {
			lines.push(`- \`${e.url}\` — ${e.error ?? `HTTP ${e.status}`}`);
		}
		lines.push('');
	}

	lines.push('## Топ страниц по исходящим ссылкам', '');
	const topOutgoing = [...data.pageStats].sort((a, b) => b.outgoing - a.outgoing).slice(0, 15);
	for (const p of topOutgoing) {
		lines.push(`- \`${p.url}\` → ${p.outgoing} ссылок`);
	}

	return lines.join('\n');
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const { routes, disabledRoutes, domain } = collectAllRoutes();
	const baseOrigin = args.base.replace(/\/$/, '');

	console.log(`\n🔗 Карта перелинковки`);
	console.log(`   Домен: ${domain}`);
	console.log(`   Источник HTML: ${args.fromDist ? 'dist/' : baseOrigin}`);
	console.log(`   Страниц в реестре: ${routes.length}\n`);

	// Меню и footer
	const menu = readSiteJson('menu');
	const settings = readSiteJson('settings') ?? {};
	const menuUrls = collectMenuUrls(menu ?? []);
	const footerUrls = collectFooterUrls(settings);
	const shellUrls = new Set([...menuUrls, ...footerUrls]);

	const urlSet = new Set(routes.map((r) => r.url));
	const routeByUrl = new Map(routes.map((r) => [r.url, r]));

	// Загрузка / парсинг страниц
	const pageResults = args.fromDist
		? routes.map((r) => {
				const { ok, status, html, error } = readPageFromDist(r.url);
				return {
					url: r.url,
					status,
					ok,
					links: ok ? extractLinksFromHtml(html, baseOrigin) : new Set(),
					error,
				};
		  })
		: await mapPool(
				routes,
				(r) => fetchPage(r.url, baseOrigin),
				CONCURRENCY,
		  );

	// Граф исходящих / входящих
	const outgoing = new Map();
	const incoming = new Map();

	for (const r of routes) {
		outgoing.set(r.url, new Set());
		incoming.set(r.url, new Set());
	}

	for (const result of pageResults) {
		if (!result.ok) continue;
		const from = result.url;
		const out = outgoing.get(from) ?? new Set();
		for (const link of result.links) {
			out.add(link);
			if (incoming.has(link)) {
				incoming.get(link).add(from);
			}
			// Ссылки на URL вне реестра — тоже учитываем входящие если страница есть
			if (!incoming.has(link) && urlSet.has(link)) {
				incoming.set(link, new Set([from]));
			}
		}
		outgoing.set(from, out);
	}

	// Добавляем «виртуальные» входящие из мен/footer (навигация на каждой странице)
	for (const shellUrl of shellUrls) {
		if (!incoming.has(shellUrl)) incoming.set(shellUrl, new Set());
		// Меню/footer присутствуют на всех страницах — помечаем источник как @shell
		for (const pageUrl of routes.map((r) => r.url)) {
			if (pageUrl !== shellUrl && urlSet.has(shellUrl)) {
				incoming.get(shellUrl).add('@shell');
			}
		}
	}

	const orphans = [];
	const noIncoming = [];
	const menuOnly = [];
	const fetchErrors = [];
	const pageStats = [];
	const weakLinks = [];
	const unreachableFromHome = [];

	for (const r of routes) {
		const inc = incoming.get(r.url) ?? new Set();
		// Реальные входящие (без @shell)
		const realIncoming = [...inc].filter((s) => s !== '@shell');
		const inMenu = menuUrls.has(r.url);
		const inFooter = footerUrls.has(r.url);
		const outCount = (outgoing.get(r.url) ?? new Set()).size;

		pageStats.push({ url: r.url, incoming: realIncoming.length, outgoing: outCount, inMenu, inFooter, source: r.source });

		const result = pageResults.find((p) => p.url === r.url);
		if (result && !result.ok) {
			fetchErrors.push({ url: r.url, status: result.status, error: result.error });
		}

		if (realIncoming.length === 0) {
			noIncoming.push({ url: r.url, inMenu, inFooter, source: r.source });
			if (!inMenu && !inFooter) {
				orphans.push({ url: r.url, source: r.source });
			}
		}

		if (inMenu && realIncoming.length === 0) {
			menuOnly.push(r.url);
		}
	}

	const reachable = bfsReachable('/', outgoing);
	const okUrls = new Set(
		pageResults.filter((p) => p.ok).map((p) => p.url),
	);

	for (const ps of pageStats) {
		if (!okUrls.has(ps.url)) continue;
		if (!reachable.has(ps.url)) unreachableFromHome.push(ps);
		if (ps.incoming === 1 && !ps.inMenu && !ps.inFooter) weakLinks.push(ps);
	}

	const stats = {
		totalPages: routes.length,
		totalEdges: [...outgoing.values()].reduce((s, set) => s + set.size, 0),
		inMenu: routes.filter((r) => menuUrls.has(r.url)).length,
		inFooter: routes.filter((r) => footerUrls.has(r.url)).length,
		reachableFromHome: [...reachable].filter((u) => urlSet.has(u)).length,
		noIncoming: noIncoming.length,
		trueOrphans: orphans.length,
		fetchErrors: fetchErrors.length,
		weakLinks: weakLinks.length,
		unreachableFromHome: unreachableFromHome.length,
	};

	const generatedAt = new Date().toISOString();

	// JSON graph
	const graphNodes = routes.map((r) => ({
		id: r.url,
		inMenu: menuUrls.has(r.url),
		inFooter: footerUrls.has(r.url),
		orphan: orphans.some((o) => o.url === r.url),
		incoming: (incoming.get(r.url) ?? new Set()).size,
		outgoing: (outgoing.get(r.url) ?? new Set()).size,
		source: r.source,
	}));

	const graphEdges = [];
	for (const [from, targets] of outgoing) {
		for (const to of targets) {
			if (urlSet.has(to)) graphEdges.push({ source: from, target: to });
		}
	}

	const reportData = {
		domain,
		baseOrigin,
		generatedAt,
		stats,
		disabledRoutes,
		orphans,
		noIncoming,
		menuOnly,
		fetchErrors,
		weakLinks,
		unreachableFromHome,
		pageStats,
		nodes: graphNodes,
		edges: graphEdges,
		outgoing: Object.fromEntries([...outgoing].map(([k, v]) => [k, [...v]])),
		incoming: Object.fromEntries(
			[...incoming].map(([k, v]) => [k, [...v].filter((s) => s !== '@shell')]),
		),
		menu: [...menuUrls],
	};

	fs.mkdirSync(OUT_DIR, { recursive: true });
	fs.writeFileSync(path.join(OUT_DIR, 'report.md'), buildMarkdownReport(reportData));
	fs.writeFileSync(path.join(OUT_DIR, 'graph.json'), JSON.stringify(reportData, null, 2));
	fs.writeFileSync(path.join(OUT_DIR, 'interlink-map.html'), buildHtmlReport(reportData));

	console.log('📊 Результаты:');
	console.log(`   Всего страниц:        ${stats.totalPages}`);
	console.log(`   В меню:               ${stats.inMenu}`);
	console.log(`   Достижимо с /:        ${stats.reachableFromHome}`);
	console.log(`   Без входящих:         ${stats.noIncoming}`);
	console.log(`   ⚠ Сироты:             ${stats.trueOrphans}`);
	console.log(`   Слабая связь:         ${stats.weakLinks}`);
	console.log(`   Недостижимо с /:      ${stats.unreachableFromHome}`);
	console.log(`   Ошибки загрузки:      ${stats.fetchErrors}`);
	console.log(`\n📁 Отчёты:`);
	console.log(`   ${path.join(OUT_DIR, 'report.md')}`);
	console.log(`   ${path.join(OUT_DIR, 'graph.json')}`);
	console.log(`   ${path.join(OUT_DIR, 'interlink-map.html')}`);

	if (orphans.length) {
		console.log(`\n⚠ Сироты (первые 20):`);
		for (const o of orphans.slice(0, 20)) {
			console.log(`   ${o.url}`);
		}
		if (orphans.length > 20) console.log(`   …ещё ${orphans.length - 20}`);
	}
}

function readSiteJson(name) {
	const filePath = path.join(ROOT, 'src/data/site', `${name}.json`);
	if (!fs.existsSync(filePath)) return null;
	return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
