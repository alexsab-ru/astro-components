import fs from 'fs';
import { LinkChecker } from 'linkinator';
import dotenv from 'dotenv';
const excludeDomains = ['dev.alexsab.ru', 'promo.kia-szr.ru', 'promo.kia-engels.ru','service.kia-samara.ru', 'omoda-ulyanovsk.alexsab.ru', 'jaecoo-ulyanovsk.alexsab.ru', 'belgee-penza.ru'];
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

];

dotenv.config();

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

const domain = getDomainWithProtocol(getDomain());
const outputPath = './broken_links.txt';

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

// Настройки для повторных запросов
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 2000, // 2 секунды
  timeout: 10000, // 10 секунд
};

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
        retries: RETRY_CONFIG.maxRetries,
        retryDelay: RETRY_CONFIG.retryDelay,
      });
      
      const linkResult = result.links[0];
      if (linkResult && linkResult.state === 'BROKEN') {
        retryResults.push({
          url: link.url, // Сохраняем оригинальную ссылку в отчете
          parent: link.parent,
          status: linkResult.status,
          retryAttempts: RETRY_CONFIG.maxRetries + 1,
          transformedUrl: isVkEmbed ? transformedUrl : undefined
        });
        console.log(`❌ Ссылка действительно битая: ${transformedUrl} (статус: ${linkResult.status})`);
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
  console.log(`🔍 Начинаю проверку ссылок на ${domain}...`);

  // Пропускаем проверку для исключенных доменов
  if (excludeDomains.some(excluded => domain.includes(excluded))) {
    console.log(`⏭️ Домен ${domain} находится в списке исключений. Пропускаю проверку`);
    process.exit(0);
  }

  const checker = new LinkChecker();

  const result = await checker.check({
    path: domain,
    recurse: true,
    linksToSkip,
    timeout: RETRY_CONFIG.timeout,
    retries: 1, // Первичная проверка с минимальными повторами
  });

  const brokenLinks = result.links.filter(x => x.state === 'BROKEN').map((item) => {
    return {
      url: item.url,
      parent: item.parent,
      status: item.status,
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