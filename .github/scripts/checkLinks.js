import fs from 'fs';
import { LinkChecker } from 'linkinator';
import dotenv from 'dotenv';

dotenv.config();

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

const domain = getDomainWithProtocol(process.env.DOMAIN);
const outputPath = './broken_links.txt';

async function checkLinks() {
  console.log(`🔍 Начинаю проверку ссылок на ${domain}...`);
  const checker = new LinkChecker();

  const result = await checker.check({
    path: domain,
    recurse: true,
    linksToSkip: [/javascript:void\(0\)/]
  });

  const brokenLinks = result.links.filter(x => x.state === 'BROKEN').map((item) => {
    return {
      url: item.url,
      parent: item.parent,
      status: item.status,
    }
  });

  if (brokenLinks.length) {
    let message = `<b>На сайте ${domain} обнаружены битые ссылки. Всего: ${brokenLinks.length}</b>\n\n`;
    message += brokenLinks.map(item => `<b>Ссылка</b>: ${item.url}\n<b>Родитель</b>: ${item.parent}`).join('\n\n');
    fs.writeFileSync(outputPath, message, 'utf8');
    console.log(`❌ Найдено ${brokenLinks.length} битых ссылок. Результаты сохранены в ${outputPath}`);
  } else {
    console.log('✅ Все ссылки работают корректно!');
  }
  
  console.log('✨ Проверка завершена');
  process.exit(0);
}

checkLinks();