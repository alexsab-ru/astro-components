/**
 * Имя хоста для dev-сервера, производное от DOMAIN.
 *
 * Зачем: все ~80 дилерских сайтов в разработке жили на одном origin
 * http://localhost:4321, из-за чего кэш браузера, localStorage, куки и снимки
 * усыплённых вкладок протекали между сайтами. Свой хост на домен разводит origin.
 *
 * Важно: сокет на такое имя биндить нельзя — macOS не резолвит *.localhost
 * (dns.lookup отдаёт ENOTFOUND), это делает сам браузер. Значение используется
 * только для URL, который мы открываем.
 *
 * @param {unknown} rawDomain — DOMAIN из .env или site из scripts.json
 * @returns {string} например 'haval-ulyanovsk.ru.localhost' либо 'localhost'
 */
export function resolveDevHost(rawDomain) {
	if (typeof rawDomain !== 'string') return 'localhost';

	const host = rawDomain
		.trim()
		.toLowerCase()
		.replace(/^https?:\/\//, '')
		.replace(/[:/?#].*$/, '');

	if (!host || host === 'localhost' || host === '127.0.0.1') return 'localhost';
	if (host.endsWith('.localhost')) return host;

	return `${host}.localhost`;
}
