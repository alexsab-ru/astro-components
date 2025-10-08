import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const brokenLinksPath = path.join(__dirname, 'broken_links.txt');

// Получаем переменные окружения для Telegram
const TELEGRAM_BOT_TOKEN = '';
const TELEGRAM_CHAT_ID = '';

// Максимальная длина сообщения в Telegram (4096 символов)
// Оставляем запас на заголовок "Часть X/Y"
const MAX_MESSAGE_LENGTH = 4096;
const SAFE_MESSAGE_LENGTH = 3900; // Безопасная длина с запасом на заголовок

/**
 * Отправляет сообщение в Telegram
 * @param {string} message - Текст сообщения для отправки
 * @returns {Promise<boolean>} - Успешность отправки
 */
async function sendToTelegram(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('❌ Ошибка: не заданы TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID');
    return false;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML', // Используем HTML для форматирования
        disable_web_page_preview: true, // Отключаем превью ссылок
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Ошибка при отправке в Telegram:', error);
      return false;
    }

    console.log('✅ Сообщение успешно отправлено в Telegram');
    return true;
  } catch (error) {
    console.error('❌ Ошибка при отправке в Telegram:', error.message);
    return false;
  }
}

/**
 * Разбивает длинное сообщение на части, не превышающие лимит Telegram
 * @param {string} text - Полный текст сообщения
 * @returns {string[]} - Массив частей сообщения
 */
function splitMessage(text) {
  const messages = [];
  const sections = text.split(/(?=\n====)/); // Разбиваем по разделам доменов
  
  let currentMessage = '';
  
  for (const section of sections) {
    // Если секция сама по себе слишком длинная, разбиваем её по отдельным ссылкам
    if (section.length > SAFE_MESSAGE_LENGTH) {
      // Сохраняем текущее накопленное сообщение
      if (currentMessage) {
        messages.push(currentMessage.trim());
        currentMessage = '';
      }
      
      // Разбиваем длинную секцию по отдельным ссылкам
      const lines = section.split('\n');
      let sectionPart = '';
      
      for (const line of lines) {
        // Проверяем, не превысит ли добавление строки лимит
        if ((sectionPart + line + '\n').length > SAFE_MESSAGE_LENGTH) {
          if (sectionPart) {
            messages.push(sectionPart.trim());
            sectionPart = '';
          }
          // Если даже одна строка слишком длинная (маловероятно, но проверим)
          if (line.length > SAFE_MESSAGE_LENGTH) {
            // Обрезаем длинную строку
            messages.push(line.substring(0, SAFE_MESSAGE_LENGTH - 3) + '...');
          } else {
            sectionPart = line + '\n';
          }
        } else {
          sectionPart += line + '\n';
        }
      }
      
      if (sectionPart) {
        currentMessage = sectionPart;
      }
    } 
    // Если добавление секции превысит лимит
    else if ((currentMessage + section).length > SAFE_MESSAGE_LENGTH) {
      // Сохраняем текущее сообщение
      if (currentMessage) {
        messages.push(currentMessage.trim());
      }
      // Начинаем новое сообщение с текущей секции
      currentMessage = section;
    } else {
      currentMessage += section;
    }
  }
  
  // Добавляем последнее сообщение
  if (currentMessage) {
    messages.push(currentMessage.trim());
  }
  
  return messages;
}

/**
 * Основная функция проверки и отправки уведомлений
 */
export async function sendNotificationToTelegram() {
  console.log('📧 Проверяю наличие битых ссылок для отправки в Telegram...');

  // Проверяем существование файла
  if (!fs.existsSync(brokenLinksPath)) {
    console.log('✅ Файл broken_links.txt не найден. Уведомление не требуется.');
    return;
  }

  // Читаем содержимое файла
  const content = fs.readFileSync(brokenLinksPath, 'utf8').trim();

  // Проверяем, не пустой ли файл
  if (!content || content.length === 0) {
    console.log('✅ Файл broken_links.txt пуст. Битых ссылок не обнаружено.');
    return;
  }

  console.log('⚠️ Обнаружены битые ссылки! Отправляю уведомление в Telegram...');

  // Добавляем заголовок к сообщению
  const headerMessage = '🚨 <b>Обнаружены битые ссылки на сайтах!</b>\n';
  const fullMessage = headerMessage + content;

  // Разбиваем сообщение на части, если оно слишком длинное
  const messages = splitMessage(fullMessage);

  console.log(`📨 Отправляю ${messages.length} сообщени${messages.length === 1 ? 'е' : 'й/я'}...`);

  // Отправляем все части сообщения
  let allSent = true;
  for (let i = 0; i < messages.length; i++) {
    const partHeader = messages.length > 1 ? `\n<i>Часть ${i + 1}/${messages.length}</i>\n\n` : '';
    const success = await sendToTelegram(partHeader + messages[i]);
    
    if (!success) {
      allSent = false;
      break;
    }
    
    // Небольшая пауза между сообщениями, чтобы избежать rate limiting
    if (i < messages.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  if (allSent) {
    console.log('✨ Все уведомления успешно отправлены в Telegram');
  } else {
    console.error('❌ Не удалось отправить все уведомления');
    process.exit(1);
  }
}

// Если файл запущен напрямую (не импортирован), выполняем функцию
if (import.meta.url === `file://${process.argv[1]}`) {
  sendNotificationToTelegram().catch(error => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });
}

