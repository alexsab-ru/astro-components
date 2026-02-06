import fs from 'fs';
import dns from 'node:dns';
import dotenv from 'dotenv';

// Подавляем warning от устаревшего builtin punycode, который тянет node-fetch
const originalEmitWarning = process.emitWarning.bind(process);
process.emitWarning = (warning, ...args) => {
  const code = typeof warning === 'object' && warning?.code ? warning.code : args[1];
  const message = typeof warning === 'string' ? warning : warning?.message;
  if (code === 'DEP0040' || message?.includes('punycode')) {
    return;
  }
  return originalEmitWarning(warning, ...args);
};

// GitHub runners и часть локальных сетей без IPv6 → принудительно идём по IPv4
dns.setDefaultResultOrder('ipv4first');

// Динамически импортируем после подавления warning
const { LinkChecker } = await import('linkinator');

const excludeDomains = [
  'service.kia-samara.ru',
  'service.kia-szr.ru',
  'service.kia-engels.ru',
  'ac-engels.ru',
  'dev.alexsab.ru'
];

const linksToSkip = [
  /javascript:void\(0\)/,
  /checkLinks\.md/,
  /^https?:\/\/(www\.)?probegcentr\.ru/,
  /^https?:\/\/(www\.)?vtb\.ru/,
  // Пропускаем ссылку https://service.kia-samara.ru/?utm_source=promo Берется из menu.json
  /^https?:\/\/(www\.)?service\.kia-samara\.ru/,
  'http://carcade.com/',
  'https://shop.vsk.ru/',
  'https://www.vsk.ru/klientam',
  'https://www.cbr.ru/statistics/insurance/ssd_stat/',
  'https://sovcombank.ru/'
];

dotenv.config();
const PROBE_TIMEOUT_MS = 8000;
const outputPath = './broken_links.txt';

// Настройки для повторных запросов
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 2000, // 2 секунды
  timeout: 10000, // 10 секунд
};

const Codes = {
  RATE_LIMIT: 429, // Rate limiting - не ошибка ссылки, а защита от ботов
}

/**
 * Gets domain from environment variable or .env file
 * @returns {string} The domain to check
 */
function getDomain() {
  // Сначала проверяем переменную окружения
  if (process.env.DOMAIN) {
    return process.env.DOMAIN;
  }
  
  // Если нет переменной окружения, читаем из .env файла
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const domainMatch = envContent.match(/^DOMAIN=(.+)$/m);
    if (domainMatch) {
      const domainValue = domainMatch[1].trim();
      // Убираем кавычки если есть
      return domainValue.replace(/^["']|["']$/g, '');
    }
  } catch (error) {
    console.log('⚠️ Файл .env не найден или не может быть прочитан');
  }
  
  // Если ничего не найдено, используем localhost по умолчанию
  console.log('⚠️ Домен не найден в переменных окружения или .env файле. Использую localhost:4343');
  return 'localhost:4343';
}

/**
 * Determines the correct protocol for a domain
 * @param {string} domain - The domain to check
 * @returns {string} The domain with the correct protocol
 */
function getDomainWithProtocol(domain) {
  // If domain already has protocol, return as is
  if (domain.startsWith('http://') || domain.startsWith('https://')) {
    return domain;
  }
  
  // Add protocol based on domain
  const protocol = domain.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${domain}`;
}

/**
 * Упрощенный fetch с таймаутом
 */
async function fetchWithTimeout(url, options = {}, timeout = PROBE_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Request timeout')), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Проверяем, что домен вообще доступен, и при необходимости откатываемся на http
 */
async function probeDomainAvailability(domainUrl) {
  const normalized = getDomainWithProtocol(domainUrl);
  const candidates = [normalized];

  if (normalized.startsWith('https://')) {
    candidates.push(normalized.replace(/^https:/, 'http:'));
  }

  const errors = [];

  for (const candidate of candidates) {
    try {
      const response = await fetchWithTimeout(candidate, { method: 'HEAD', redirect: 'follow' });
      if (Number.isInteger(response?.status)) {
        return { ok: true, url: candidate, status: response.status };
      }
      errors.push(`${candidate} ответил статусом ${response?.status ?? 'unknown'}`);
    } catch (error) {
      const cause = error?.cause || {};
      const extra = cause.code || cause.errno || cause.type || cause.reason;
      errors.push(`${candidate}: ${error.message}${extra ? ` (${extra})` : ''}`);
    }
  }

  return { ok: false, errors };
}

/**
 * Достаём человекочитаемую ошибку из failureDetails linkinator
 */
function extractFailureReason(failureDetails) {
  if (!Array.isArray(failureDetails)) return undefined;

  for (const detail of failureDetails) {
    if (!detail) continue;
    if (detail.error?.message) {
      return `${detail.code ? `${detail.code}: ` : ''}${detail.error.message}`;
    }
    if (detail.code && detail.message) {
      return `${detail.code}: ${detail.message}`;
    }
    if (detail.message) {
      return detail.message;
    }
    if (detail.status) {
      return `HTTP ${detail.status}`;
    }
  }

  return undefined;
}

const configuredDomain = getDomainWithProtocol(getDomain());

/**
 * Преобразует VK embed-ссылки в прямые ссылки на видео
 * @param {string} url - URL для проверки
 * @returns {string} Преобразованная ссылка или оригинальная
 */
function transformVkEmbedUrl(url) {
  // Проверяем, является ли это VK embed-ссылкой
  const vkEmbedMatch = url.match(/vkvideo\.ru\/video_ext\.php\?oid=(-?\d+)&id=(\d+)/);
  
  if (vkEmbedMatch) {
    const [, oid, id] = vkEmbedMatch;
    // Преобразуем в прямую ссылку на видео VK
    return `https://vk.com/video${oid}_${id}`;
  }
  
  return url;
}

/**
 * Выполняет повторную проверку битых ссылок
 * @param {Array} brokenLinks - Массив битых ссылок
 * @returns {Array} Массив действительно битых ссылок после повторной проверки
 */
async function retryBrokenLinks(brokenLinks) {
  console.log(`🔄 Повторная проверка ${brokenLinks.length} битых ссылок...`);
  
  const checker = new LinkChecker();
  const retryResults = [];
  
  for (const link of brokenLinks) {
    // Преобразуем VK embed-ссылки в прямые
    const transformedUrl = transformVkEmbedUrl(link.url);
    const isVkEmbed = transformedUrl !== link.url;
    
    if (isVkEmbed) {
      console.log(`🔄 Преобразую VK embed-ссылку: ${link.url} → ${transformedUrl}`);
    }
    
    console.log(`🔍 Проверяю повторно: ${transformedUrl}`);
    
    try {
      const result = await checker.check({
        path: transformedUrl,
        recurse: false,
        timeout: RETRY_CONFIG.timeout,
        retryErrors: true,
        retryErrorsCount: RETRY_CONFIG.maxRetries,
        retryErrorsJitter: RETRY_CONFIG.retryDelay,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
        }
      });
      
      const linkResult = result.links[0];
      if (linkResult && linkResult.state === 'BROKEN') {
        // Исключаем 429 (Rate Limiting) - это не битая ссылка, а защита от ботов
        if (linkResult.status === Codes.RATE_LIMIT) {
          console.log(`⏭️ Пропускаю ${transformedUrl} - статус 429 (Rate Limiting). Сервер работает, но ограничивает частоту запросов`);
        } else {
          retryResults.push({
            url: link.url, // Сохраняем оригинальную ссылку в отчете
            parent: link.parent,
            status: linkResult.status,
            retryAttempts: RETRY_CONFIG.maxRetries + 1,
            transformedUrl: isVkEmbed ? transformedUrl : undefined,
            error: extractFailureReason(linkResult.failureDetails),
          });
          console.log(`❌ Ссылка действительно битая: ${transformedUrl} (статус: ${linkResult.status})`);
        }
      } else {
        console.log(`✅ Ссылка работает после повторной проверки: ${transformedUrl}`);
      }
    } catch (error) {
      console.log(`⚠️ Ошибка при повторной проверке ${transformedUrl}: ${error.message}`);
      retryResults.push({
        url: link.url,
        parent: link.parent,
        status: 'TIMEOUT_ERROR',
        retryAttempts: RETRY_CONFIG.maxRetries + 1,
        error: error.message,
        transformedUrl: isVkEmbed ? transformedUrl : undefined
      });
    }
  }
  
  return retryResults;
}

async function checkLinks() {
  let domain = configuredDomain;
  console.log(`🔍 Начинаю проверку ссылок на ${domain}...`);
  const strictProbe = ['1', 'true', 'yes'].includes(String(process.env.STRICT_DOMAIN_PROBE || '').toLowerCase());

  // Пропускаем проверку для исключенных доменов
  if (excludeDomains.some(excluded => domain.includes(excluded))) {
    console.log(`⏭️ Домен ${domain} находится в списке исключений. Пропускаю проверку`);
    process.exit(0);
  }

  // Пробуем достучаться до домена заранее и откатываемся на http при проблемах с TLS
  const reachability = await probeDomainAvailability(domain);
  if (!reachability.ok) {
    console.log('⚠️ Не удалось подтвердить доступность домена предварительно (DNS/сертификат?):');
    reachability.errors.forEach(error => console.log(` - ${error}`));
    if (strictProbe) {
      process.exit(1);
    } else {
      console.log('⏩ Продолжаю проверку ссылок, несмотря на неуспешную пробу. Установите STRICT_DOMAIN_PROBE=1 чтобы останавливать процесс.');
    }
  }

  if (reachability.ok && reachability.url && reachability.url !== domain) {
    console.log(`ℹ️ HTTPS не ответил корректно, переключаюсь на ${reachability.url}`);
    domain = reachability.url;
  }

  const checker = new LinkChecker();

  const result = await checker.check({
    path: domain,
    recurse: true,
    linksToSkip,
    timeout: RETRY_CONFIG.timeout,
    retryErrors: true,
    retryErrorsCount: 2,
    retryErrorsJitter: 500,
  });

  const brokenLinks = result.links
    .filter(x => x.state === 'BROKEN')
    .filter(x => {
      // Исключаем 429 (Rate Limiting) - это не битая ссылка, а временная блокировка
      if (x.status === Codes.RATE_LIMIT) {
        console.log(`⏭️ Пропускаю ${x.url} - статус 429 (Rate Limiting), сервер работает`);
        return false;
      }
      return true;
    })
    .map((item) => {
      return {
        url: item.url,
        parent: item.parent,
        status: item.status,
        error: extractFailureReason(item.failureDetails),
      }
    });

  console.log(`📊 Первичная проверка завершена. Найдено ${brokenLinks.length} потенциально битых ссылок.`);

  // Если есть битые ссылки, выполняем повторную проверку
  let finalBrokenLinks = brokenLinks;
  if (brokenLinks.length > 0) {
    finalBrokenLinks = await retryBrokenLinks(brokenLinks);
  }

  if (finalBrokenLinks.length) {
    let message = `<b>На сайте ${domain} обнаружены битые ссылки. Всего: ${finalBrokenLinks.length}</b>\n\n`;
    message += finalBrokenLinks.map(item => {
      let linkInfo = `<b>Ссылка</b>: ${item.url}\n<b>Родитель</b>: ${item.parent}\n<b>Статус</b>: ${item.status}`;
      if (item.transformedUrl) {
        linkInfo += `\n<b>Проверялась как</b>: ${item.transformedUrl}`;
      }
      if (item.retryAttempts) {
        linkInfo += `\n<b>Попыток проверки</b>: ${item.retryAttempts}`;
      }
      if (item.error) {
        linkInfo += `\n<b>Ошибка</b>: ${item.error}`;
      }
      return linkInfo;
    }).join('\n\n');
    
    fs.writeFileSync(outputPath, message, 'utf8');
    console.log(`❌ После повторной проверки найдено ${finalBrokenLinks.length} действительно битых ссылок. Результаты сохранены в ${outputPath}`);
  } else {
    console.log('✅ Все ссылки работают корректно!');
    // Удаляем файл с битыми ссылками, если он существует
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
  }
  
  console.log('✨ Проверка завершена');
  process.exit(0);
}

checkLinks();
