import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LinkChecker } from 'linkinator';
import { getDomains } from './getDomains.js';
import { transformVkUrl } from './transformVkUrl.js';
import { sendNotificationToTelegram } from './sendTelegram.js';

// Настройки для повторных запросов
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 2000, // 2 секунды
  timeout: 10000, // 10 секунд
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputPath = path.join(__dirname, 'broken_links.txt');

const domains = await getDomains();

if (!domains?.length) {
  console.log('Список доменов пуст.');
  process.exit(0);
}

if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

for (const domain of domains) {
  await checkLinks(`https://${domain}`);
}

console.log('✨ Все проверки завершены');

// Отправляем уведомление в Telegram, если были найдены битые ссылки
await sendNotificationToTelegram();

process.exit(0);

async function retryBrokenLinks(brokenLinks) {
  console.log(`🔄 Повторная проверка ${brokenLinks.length} битых ссылок...`);
  
  const checker = new LinkChecker();
  const retryResults = [];
  
  for (const link of brokenLinks) {
    // Преобразуем VK embed-ссылки в прямые
    const transformedUrl = transformVkUrl(link.url);
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

async function checkLinks(domain) {
  console.log(`🔍 Начинаю проверку ссылок на ${domain}...`);
  const checker = new LinkChecker();

  const result = await checker.check({
    path: domain,
    recurse: true,
    linksToSkip: [
      /javascript:void\(0\)/,
      /checkLinks\.md/
    ],
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
    const header = `\n==== ${domain} ====\n`;
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
    
    fs.appendFileSync(outputPath, header + message + '\n', 'utf8');
    console.log(`❌ После повторной проверки найдено ${finalBrokenLinks.length} действительно битых ссылок. Результаты сохранены в ${outputPath}`);
  } else {
    console.log('✅ Все ссылки работают корректно!');
  }
};