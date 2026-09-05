import { searchForWorkspaceRoot } from 'vite';
import { createOffersSync, linkedJsonSource } from './localJson.mjs';

/** Local-only companion to linkJson; source location is shared with Tailwind. */
export default function localJsonDev(root = process.cwd()) {
	const source = linkedJsonSource(root);
	if (!source) return [];
	const offers = createOffersSync(root, source);
	let contentFiles;
	return {
		name: 'local-json-dev',
		apply: 'serve',
		config() {
			contentFiles = offers.sync();
			return { server: { fs: {
				allow: [searchForWorkspaceRoot(root), source.jsonRoot],
				deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/leads.json'],
			} } };
		},
		configureServer(server) {
			server.watcher.add(offers.watchPaths);
			let timer;
			const onEvent = (event, file) => {
				if (!['add', 'change', 'unlink', 'addDir', 'unlinkDir'].includes(event) || !offers.matches(file)) return;
				clearTimeout(timer);
				timer = setTimeout(async () => {
					try {
						const nextContentFiles = offers.sync();
						// Astro 5 needs to rebuild its MDX import map when entries are added/removed.
						if (nextContentFiles !== contentFiles) {
							contentFiles = nextContentFiles;
							await server.restart();
						}

						server.config.logger.info('[local-json] special-offers updated');
					} catch (error) {
						server.config.logger.error(`[local-json] ${error.message}`);
						server.ws.send({ type: 'error', err: { message: error.message, stack: error.stack } });
					}
				}, 100);
			};
			server.watcher.on('all', onEvent);
			server.httpServer?.once('close', () => {
				clearTimeout(timer);
				server.watcher.off('all', onEvent);
			});
		},
	};
}
