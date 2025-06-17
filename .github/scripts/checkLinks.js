import fs from 'fs';
import { LinkChecker } from 'linkinator';
import dotenv from 'dotenv';

dotenv.config();

const domain = process.env.DOMAIN;
const outputPath = './broken_links.txt';

async function checkLinks() {
  console.log('🔍 Начинаю проверку ссылок...');
  const checker = new LinkChecker();

  const result = await checker.check({
    path: `https://${domain}`,
    recurse: true,
    // linksToSkip: []
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