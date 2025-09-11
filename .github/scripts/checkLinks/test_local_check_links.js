import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Скрипт для локального тестирования проекта
 * Запускает dev сервер, проверяет ссылки и останавливает сервер
 */

const PORT = 4343;
const DOMAIN = `localhost:${PORT}`;
const MAX_WAIT_TIME = 30000; // 30 секунд максимум ожидания

/**
 * Ждет пока сервер станет доступным
 * @param {string} url - URL для проверки
 * @param {number} maxWaitTime - Максимальное время ожидания в мс
 * @returns {Promise<boolean>} - true если сервер доступен
 */
async function waitForServer(url, maxWaitTime = MAX_WAIT_TIME) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const response = await fetch(`http://${url}`);
      if (response.ok) {
        console.log(`✅ Сервер доступен на http://${url}`);
        return true;
      }
    } catch (error) {
      // Сервер еще не готов, продолжаем ждать
    }
    
    // Ждем 1 секунду перед следующей попыткой
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`❌ Сервер не стал доступен за ${maxWaitTime / 1000} секунд`);
  return false;
}

/**
 * Запускает команду и возвращает Promise
 * @param {string} command - Команда для выполнения
 * @param {Array} args - Аргументы команды
 * @param {Object} options - Опции для spawn
 * @returns {Promise<{code: number, stdout: string, stderr: string}>}
 */
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    // Переименован в childProcess, чтобы не затенять глобальный process
    const childProcess = spawn(command, args, {
      stdio: 'pipe',
      shell: true,
      ...options
    });

    let stdout = '';
    let stderr = '';

    childProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    childProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    childProcess.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    childProcess.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Останавливает только тот dev-сервер, который мы запустили
 * Без использования pkill, чтобы не задеть чужие процессы (например, VS Code)
 */
async function stopAstroDev(astroProcess) {
  // Вспомогательная функция ожидания
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  if (!astroProcess?.pid) {
    return;
  }

  try {
    console.log('🛑 Останавливаю dev сервер...');
    // Мы запускали процесс с detached:true → он лидер собственной группы.
    // Шлём SIGTERM всей группе (минус перед pid = группа процессов на *nix).
    try {
      process.kill(-astroProcess.pid, 'SIGTERM');
    } catch (e) {
      // Мог уже завершиться — это нормально.
    }

    // Даем до 2 сек на корректное завершение
    await wait(2000);

    // Проверяем, осталась ли группа жива (signal 0 = только проверка)
    let alive = true;
    try {
      process.kill(-astroProcess.pid, 0);
    } catch (_) {
      alive = false;
    }

    if (alive) {
      // Эскалируем до SIGKILL, если не завершился
      try {
        process.kill(-astroProcess.pid, 'SIGKILL');
      } catch (_) {}
    }

    console.log('✅ Dev сервер остановлен');
  } catch (error) {
    console.log('⚠️ Не удалось корректно остановить dev сервер:', error.message);
  }
}

/**
 * Основная функция тестирования
 */
async function testLocal() {
  console.log('🚀 Начинаю локальное тестирование проекта...');
  
  let astroProcess = null;
  
  try {
    // Запускаем dev сервер
    console.log(`🌐 Запускаю dev сервер на порту ${PORT}...`);
    // Используем npx для надежного поиска локального бинарника astro
    astroProcess = spawn('npx', ['astro', 'dev', '--port', PORT.toString(), '--config', 'astro.local.config.mjs'], {
      stdio: 'pipe',
      shell: true, // оставляем true для надежного поиска npx в PATH
      detached: true // чтобы можно было завершать всю группу процессов корректно
    });

    // Обработчик ошибок запуска dev-сервера (например, если astro не найден)
    astroProcess.on('error', (err) => {
      console.error(`❌ Не удалось запустить astro dev: ${err.message}`);
    });

    // Ждем пока сервер станет доступным
    const serverReady = await waitForServer(DOMAIN);
    if (!serverReady) {
      throw new Error('Сервер не запустился');
    }

    // Даем серверу дополнительное время для полной инициализации
    console.log('⏳ Дополнительное время для инициализации сервера...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Запускаем проверку ссылок
    console.log('🔍 Запускаю проверку ссылок...');
    const linkCheckResult = await runCommand('node', ['.github/scripts/checkLinks/checkLinks.js'], {
      env: { ...process.env, DOMAIN }
    });

    if (linkCheckResult.code === 0) {
      console.log('✅ Проверка ссылок завершена успешно');
      console.log(linkCheckResult.stdout);
    } else {
      console.log('❌ Ошибка при проверке ссылок:');
      console.log(linkCheckResult.stderr);
    }

    // Проверяем наличие файла с результатами
    const brokenLinksFile = './broken_links.txt';
    if (fs.existsSync(brokenLinksFile)) {
      const content = fs.readFileSync(brokenLinksFile, 'utf8');
      console.log('\n📄 Результаты проверки ссылок:');
      console.log(content);
    } else {
      console.log('\n✅ Битых ссылок не найдено!');
    }

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  } finally {
    // Останавливаем только тот dev-сервер, который мы запускали выше
    await stopAstroDev(astroProcess);
  }
  
  console.log('✨ Локальное тестирование завершено');
}

// Запускаем тестирование
testLocal().catch(console.error);
