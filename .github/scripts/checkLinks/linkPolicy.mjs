import { readFile } from 'node:fs/promises';

export const DEFAULT_POLICY_PATH = 'src/data/common/link-checker.json';

export const normalizeHost = (host) => host.toLowerCase().replace(/^www\./, '');

export function validatePolicy(policy) {
	if (policy?.version !== 1 || !Array.isArray(policy.excludeSites) || !Array.isArray(policy.skip)) {
		throw new Error('Некорректная схема исключений линкинатора (ожидается version: 1, excludeSites и skip).');
	}
	const validHost = (host) => typeof host === 'string' && /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/i.test(host);
	if (policy.excludeSites.some(host => !validHost(host))) {
		throw new Error('excludeSites должен содержать имена хостов без протокола и пути.');
	}
	for (const rule of policy.skip) {
		if (!rule || !validHost(rule.host) || typeof rule.reason !== 'string' || !rule.reason.trim()) {
			throw new Error('Каждое исключение должно содержать host и reason.');
		}
		if (rule.pathname !== undefined && rule.pathPrefix !== undefined) {
			throw new Error('Укажите pathname или pathPrefix, а не оба поля.');
		}
		for (const field of ['pathname', 'pathPrefix']) {
			if (rule[field] !== undefined && (typeof rule[field] !== 'string' || !rule[field].startsWith('/'))) {
				throw new Error(`${field} должен быть путём, начинающимся с /.`);
			}
		}
	}
	return policy;
}

export function matchesSkipRule(link, policy) {
	let url;
	try {
		url = new URL(link);
	} catch {
		return false;
	}
	if (!['http:', 'https:'].includes(url.protocol)) return false;
	return policy.skip.some(rule =>
		normalizeHost(url.hostname) === normalizeHost(rule.host) &&
		(rule.pathname === undefined || url.pathname === rule.pathname) &&
		(rule.pathPrefix === undefined || url.pathname.startsWith(rule.pathPrefix))
	);
}

export async function loadLinkPolicy(source = DEFAULT_POLICY_PATH) {
	const policy = JSON.parse(await readFile(source, 'utf8'));
	return { policy: validatePolicy(policy), source };
}
