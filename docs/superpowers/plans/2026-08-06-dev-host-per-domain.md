# Dev-хост `*.localhost` на каждый дилерский сайт — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Открывать dev-сервер `astro-components` на хосте, производном от `DOMAIN`
(`haval-ulyanovsk.ru` → `http://haval-ulyanovsk.ru.localhost:4321/`), чтобы кэш, storage
и куки разных дилерских сайтов не пересекались.

**Architecture:** Чистая функция `resolveDevHost()` в `src/js/utils/` (тот же слой, откуда
`astro.config.mjs` уже импортирует `pathMatchesRouteRules`) покрывается unit-тестами.
Оба конфига получают `server: { host: true }` (биндим все интерфейсы, как раньше делал
флаг `--host`) и inline-интеграцию `dev-host-open`, которая в хуке `astro:server:start`
открывает браузер на нужном хосте с **фактическим** портом. Сокет на `*.localhost`
не биндим — macOS такие имена не резолвит (проверено: `dns.lookup('test.localhost')`
→ `ENOTFOUND`), это делает сам браузер.

**Tech Stack:** Astro 5.16.6, Vite 7.3.0, Node ESM, `node --test` + `node:assert/strict`.

## Global Constraints

- Спека: `docs/superpowers/specs/2026-08-06-dev-host-per-domain-design.md`.
- Стиль кода (`.prettierrc`): табы, ширина 4, одинарные кавычки.
- `http://localhost:4321/` и `http://127.0.0.1:4321/` обязаны продолжать работать —
  ломать привычный флоу и Safari нельзя.
- **`server.open` строкой не использовать.** Vite открывает через
  `new URL(options.open, url).href`; абсолютный URL игнорирует базу, поэтому при
  автоинкременте порта вкладка ушла бы на чужой уже запущенный инстанс.
- Автоинкремент порта (4321 → 4322 → …) должен сохраниться. Он зависит только от
  `strictPort`, который Astro не выставляет, а у Vite он по умолчанию `false`.
  Ни один шаг плана не должен выставлять `strictPort`.
- `server.allowedHosts` не трогаем: Vite 7 пропускает `*.localhost` по умолчанию
  (`node_modules/vite/dist/node/chunks/config.js`, `isHostAllowedInternal`).
- Прод-сборка не затрагивается: `server` действует только в `astro dev` / `astro preview`.
- Никогда не запускать `pnpm dev` / `dd*` на переднем плане — сервер не завершается.
  Для проверок только фоновый запуск с последующим `kill`, как показано в шагах.

---

### Task 1: Чистая функция `resolveDevHost`

**Files:**
- Create: `src/js/utils/devHost.js`
- Test: `src/js/utils/devHost.test.mjs`
- Modify: `package.json` (добавить скрипт `test:dev-host`)

**Interfaces:**
- Consumes: ничего.
- Produces: `export function resolveDevHost(rawDomain: unknown): string` — возвращает
  имя хоста для dev-сервера. Задачи 2 и 3 импортируют её в конфиги.

- [ ] **Step 1: Написать падающий тест**

Создать `src/js/utils/devHost.test.mjs`. Стиль скопирован с соседнего
`src/js/utils/features.test.mjs`: голые `assert` без раннера, файл запускается
через `node --test`.

```js
import assert from 'node:assert/strict';
import {resolveDevHost} from './devHost.js';

assert.equal(
	resolveDevHost('haval-ulyanovsk.ru'),
	'haval-ulyanovsk.ru.localhost',
	'обычный домен получает суффикс .localhost'
);

assert.equal(
	resolveDevHost('promo.kia-samara.ru'),
	'promo.kia-samara.ru.localhost',
	'многоуровневый домен сохраняет точки'
);

assert.equal(
	resolveDevHost('localhost'),
	'localhost',
	'DOMAIN=localhost не превращается в localhost.localhost'
);

assert.equal(
	resolveDevHost('127.0.0.1'),
	'localhost',
	'петлевой IP отдаёт обычный localhost'
);

assert.equal(
	resolveDevHost(''),
	'localhost',
	'пустое значение отдаёт обычный localhost'
);

assert.equal(
	resolveDevHost(undefined),
	'localhost',
	'отсутствующее значение отдаёт обычный localhost'
);

assert.equal(
	resolveDevHost(null),
	'localhost',
	'null отдаёт обычный localhost'
);

assert.equal(
	resolveDevHost(42),
	'localhost',
	'не-строка отдаёт обычный localhost'
);

assert.equal(
	resolveDevHost('https://haval-ulyanovsk.ru'),
	'haval-ulyanovsk.ru.localhost',
	'протокол https отбрасывается'
);

assert.equal(
	resolveDevHost('http://haval-ulyanovsk.ru/'),
	'haval-ulyanovsk.ru.localhost',
	'протокол http и завершающий слэш отбрасываются'
);

assert.equal(
	resolveDevHost('haval-ulyanovsk.ru/models/f7/'),
	'haval-ulyanovsk.ru.localhost',
	'путь отбрасывается'
);

assert.equal(
	resolveDevHost('localhost:4343'),
	'localhost',
	'порт отбрасывается до проверки на localhost'
);

assert.equal(
	resolveDevHost('  haval.alexsab.ru  '),
	'haval.alexsab.ru.localhost',
	'пробелы по краям обрезаются'
);

assert.equal(
	resolveDevHost('HAVAL-Ulyanovsk.RU'),
	'haval-ulyanovsk.ru.localhost',
	'регистр приводится к нижнему — имена хостов регистронезависимы'
);

assert.equal(
	resolveDevHost('haval-ulyanovsk.ru.localhost'),
	'haval-ulyanovsk.ru.localhost',
	'уже готовый .localhost не удваивается'
);
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `node --test src/js/utils/devHost.test.mjs`

Expected: FAIL — `Cannot find module ... /src/js/utils/devHost.js`.

- [ ] **Step 3: Реализовать минимальную версию**

Создать `src/js/utils/devHost.js`:

```js
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
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `node --test src/js/utils/devHost.test.mjs`

Expected: PASS — `# pass 1`, `# fail 0`.

- [ ] **Step 5: Добавить скрипт в `package.json`**

Рядом с существующим `"test:schema-org"` добавить:

```json
"test:dev-host": "node --test src/js/utils/devHost.test.mjs",
```

Проверить: `pnpm test:dev-host` → PASS.

- [ ] **Step 6: Коммит**

```bash
/usr/bin/git add src/js/utils/devHost.js src/js/utils/devHost.test.mjs package.json
/usr/bin/git commit -m "feat(dev): add resolveDevHost helper for per-domain dev origin"
```

---

### Task 2: Подключить хост и открытие браузера в `astro.config.mjs`

**Files:**
- Modify: `astro.config.mjs` (импорты ~строка 14; `resolveSiteFromConfig` строки 31–52;
  массив `devToolbarIntegrations` строки 179–182; inline-интеграции рядом со строкой 186;
  объект `defineConfig` — добавить `server` перед ключом `vite` на строке 239)

**Interfaces:**
- Consumes: `resolveDevHost` из `./src/js/utils/devHost.js` (Task 1).
- Produces: `readRawDomain()`, `devHost`, `devOpenEnabled` и
  `devHostOpenIntegration(host)` внутри `astro.config.mjs`. Task 3 повторяет тот же
  набор в `astro.local.config.mjs`; Task 4 полагается на то, что `host` и открытие
  браузера заданы в конфиге, а не флагами CLI.

- [ ] **Step 1: Добавить импорты**

После строки 14 (`import { pathMatchesRouteRules } ...`) добавить:

```js
import { spawn } from 'node:child_process';
import { resolveDevHost } from './src/js/utils/devHost.js';
```

- [ ] **Step 2: Вынести `readRawDomain()` из `resolveSiteFromConfig`**

Сейчас чтение `scripts.json` → `env.DOMAIN` зашито внутри `resolveSiteFromConfig`
(строки 31–52) и доступно только для `site:`. Выносим общий источник, чтобы адрес
в браузере не мог разойтись с тем, что реально собирается.

Заменить блок строк 31–52 на:

```js
// Единый источник домена: приоритетно src/data/site/scripts.json, затем .env DOMAIN.
// Используется и для site:, и для dev-хоста — чтобы они не могли разойтись.
const readRawDomain = () => {
    const scriptsJsonPath = path.resolve(process.cwd(), 'src/data/site/scripts.json');
    let scriptsSiteFromJson = '';
    try {
        const rawFileContent = fs.readFileSync(scriptsJsonPath, 'utf-8');
        const parsedJson = JSON.parse(rawFileContent);
        // В JSON ключ называется "site". Допускаем отсутствие.
        scriptsSiteFromJson = (parsedJson?.site ?? '').toString().trim();
    } catch (_) {
        // Файл может отсутствовать на ранних этапах. Это нормально.
    }

    return scriptsSiteFromJson || ((env.DOMAIN ?? process.env.DOMAIN ?? '').toString().trim());
};

const resolveSiteFromConfig = (fallbackUrl) => {
    const rawDomain = readRawDomain();

    // Нормализуем до https://<domain>. Также переводим http:// -> https://.
    if (!rawDomain) return fallbackUrl;
    if (rawDomain.startsWith('https://')) return rawDomain;
    if (rawDomain.startsWith('http://')) return rawDomain.replace(/^http:\/\//, 'https://');
    return `https://${rawDomain}`;
};
```

- [ ] **Step 3: Вычислить dev-хост рядом с `computedSite`**

Сразу после строки `const computedSite = resolveSiteFromConfig('https://example.com');`
добавить:

```js
// --- dev-сервер ---
// Каждый дилерский сайт получает свой origin вида <DOMAIN>.localhost, иначе кэш,
// localStorage и куки протекают между сайтами (см. spec 2026-08-06-dev-host-per-domain).
// ASTRO_DEV_OPEN=0 отключает автооткрытие браузера (нужно для test_links_local).
const devHost = resolveDevHost(readRawDomain());
const devOpenEnabled = (env.ASTRO_DEV_OPEN ?? process.env.ASTRO_DEV_OPEN ?? '1') !== '0';
```

- [ ] **Step 4: Добавить inline-интеграцию `dev-host-open`**

Вставить сразу перед `const stripDisabledRoutesIntegration` (строка 186), по тому же
паттерну inline-интеграции:

```js
// Открывает браузер на origin текущего дилера.
//
// Почему не server.open: это статическая строка, вычисляемая до listen(), а Vite при
// занятом порте делает httpServer.listen(++port, host). Открытие идёт через
// `new URL(options.open, url).href`, где абсолютный URL игнорирует базу с реальным
// портом. Второй инстанс сел бы на :4322, а вкладку открыл на :4321 — то есть на
// чужом уже запущенном сайте. Хук astro:server:start отдаёт фактический address.port.
const devHostOpenIntegration = (host) => ({
	name: 'dev-host-open',
	hooks: {
		'astro:server:start': ({ address, logger }) => {
			const url = `http://${host}:${address.port}/`;
			logger.info(`Открываю ${url}`);

			const isWin = process.platform === 'win32';
			const cmd = process.platform === 'darwin' ? 'open' : isWin ? 'cmd' : 'xdg-open';
			// На Windows первый аргумент start — заголовок окна, поэтому пустая строка.
			const args = isWin ? ['/c', 'start', '', url] : [url];

			try {
				spawn(cmd, args, { stdio: 'ignore', detached: true }).unref();
			} catch (e) {
				logger.warn(`Не удалось открыть браузер: ${e}`);
			}
		},
	},
});
```

- [ ] **Step 5: Зарегистрировать интеграцию**

Заменить строки 179–182 на:

```js
const isDevCommand = process.argv.includes('dev');
const devToolbarIntegrations = isDevCommand
	? [
		(await import('./dev-toolbar/domain-switch/integration.ts')).default(),
		...(devOpenEnabled ? [devHostOpenIntegration(devHost)] : []),
	]
	: [];
```

Важно: `devHostOpenIntegration` объявлена в Step 4 ниже по файлу, но это `const`
со стрелочной функцией — к моменту вычисления массива она должна быть уже объявлена.
Поэтому блок из Step 4 разместить **выше** строки 179, вместе с остальными
объявлениями, а не после неё. Проверить порядок глазами перед запуском.

- [ ] **Step 6: Добавить блок `server` в `defineConfig`**

Вставить перед ключом `vite:` (строка 239) на том же уровне вложенности:

```js
	server: {
		host: true,
	},
```

`port` и `open` не задаём: порт остаётся астровским 4321 с автоинкрементом,
открытие браузера делает интеграция.

- [ ] **Step 7: Проверить, что хост считается верно**

Run:

```bash
node -e "
import('./src/js/utils/devHost.js').then(async (m) => {
  const fs = await import('node:fs');
  const site = JSON.parse(fs.readFileSync('src/data/site/scripts.json','utf-8')).site;
  console.log('site:', site, '-> host:', m.resolveDevHost(site));
});
"
```

Expected: `site: haval-ulyanovsk.ru -> host: haval-ulyanovsk.ru.localhost`
(значение домена зависит от текущего `.env` — важно, что суффикс `.localhost` появился).

- [ ] **Step 8: Поднять dev-сервер в фоне и проверить оба хоста**

Запуск строго в фоне — `astro dev` не завершается сам. `ASTRO_DEV_OPEN=0`, чтобы
проверка не открывала окна.

```bash
ASTRO_DEV_OPEN=0 pnpm exec astro dev > /tmp/devsrv.log 2>&1 &
sleep 25
echo '--- новый хост ---'
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: haval-ulyanovsk.ru.localhost:4321' http://127.0.0.1:4321/
echo '--- старый хост (регрессия) ---'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4321/
echo '--- заголовок страницы ---'
curl -s -H 'Host: haval-ulyanovsk.ru.localhost:4321' http://127.0.0.1:4321/ | grep -o '<title>[^<]*</title>'
pkill -f 'astro.js dev'
```

Expected: оба `curl` возвращают `200`, в `<title>` — текущий дилер, никаких
`Blocked request` в `/tmp/devsrv.log`.

- [ ] **Step 9: Главный регресс-тест — второй инстанс на занятом порту**

Это проверка ровно того дефекта, из-за которого мы отказались от `server.open`.

```bash
pnpm exec astro dev > /tmp/dev1.log 2>&1 &
sleep 25
pnpm exec astro dev > /tmp/dev2.log 2>&1 &
sleep 25
echo '--- какой порт занял второй инстанс ---'
grep -iE 'in use|4322' /tmp/dev2.log | head -5
echo '--- на какой URL он открыл браузер ---'
grep -i 'Открываю' /tmp/dev1.log /tmp/dev2.log
pkill -f 'astro.js dev'
```

Expected: второй инстанс сообщает `Port 4321 is in use, trying another one...`,
и в `/tmp/dev2.log` строка `Открываю http://<DOMAIN>.localhost:4322/` — именно
`4322`, а не `4321`. Открылись две вкладки на разных портах.

- [ ] **Step 10: Коммит**

```bash
/usr/bin/git add astro.config.mjs
/usr/bin/git commit -m "feat(dev): serve each dealer site on its own *.localhost origin"
```

---

### Task 3: То же самое в `astro.local.config.mjs`

Через этот конфиг работают `dev_local` и `dev:toyota`. Без правки они остались бы
на общем origin.

**Files:**
- Modify: `astro.local.config.mjs` (импорты строки 1–13; блок определения домена
  строки 17–52; `defineConfig` со строки 54; `site: computedSite` строка 85)

**Interfaces:**
- Consumes: `resolveDevHost` из `./src/js/utils/devHost.js` (Task 1).
- Produces: ничего для последующих задач.

- [ ] **Step 1: Добавить импорты**

В блок импортов (строки 1–13) добавить:

```js
import { spawn } from 'node:child_process';
import { resolveDevHost } from './src/js/utils/devHost.js';
```

- [ ] **Step 2: Вынести `readRawDomain()`**

В этом файле логика домена продублирована (строки 17–52, включая чтение
`scripts.json` на строке 32 и склейку `rawDomain` на строке 44). Провести ту же
правку, что в Task 2 Step 2: выделить `readRawDomain()`, а `resolveSiteFromConfig`
оставить тонкой обёрткой над ним. Код — тот же, что в Task 2 Step 2.

- [ ] **Step 3: Вычислить dev-хост**

После строки с `const computedSite = ...` добавить (тот же код, что в Task 2 Step 3):

```js
const devHost = resolveDevHost(readRawDomain());
const devOpenEnabled = (env.ASTRO_DEV_OPEN ?? process.env.ASTRO_DEV_OPEN ?? '1') !== '0';
```

- [ ] **Step 4: Добавить интеграцию `dev-host-open`**

Скопировать целиком блок `const devHostOpenIntegration = (host) => ({ ... });`
из Task 2 Step 4 — вместе с комментарием, объясняющим отказ от `server.open`.
Разместить до `defineConfig` (строка 54).

- [ ] **Step 5: Зарегистрировать интеграцию и добавить `server`**

В массив `integrations` (рядом с `domainSwitchToolbar()` на строке 56) добавить:

```js
		...(devOpenEnabled ? [devHostOpenIntegration(devHost)] : []),
```

И добавить в `defineConfig` рядом с `site: computedSite` (строка 85):

```js
	server: {
		host: true,
	},
```

- [ ] **Step 6: Проверить `dev_local`**

```bash
ASTRO_DEV_OPEN=0 pnpm exec astro dev --config astro.local.config.mjs > /tmp/devlocal.log 2>&1 &
sleep 25
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: haval-ulyanovsk.ru.localhost:4321' http://127.0.0.1:4321/
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4321/
pkill -f 'astro.js dev'
```

Expected: оба `curl` возвращают `200`, в `/tmp/devlocal.log` нет `Blocked request`.

- [ ] **Step 7: Коммит**

```bash
/usr/bin/git add astro.local.config.mjs
/usr/bin/git commit -m "feat(dev): apply per-domain dev origin to local config too"
```

---

### Task 4: Убрать `--open`/`--host` из скриптов и задокументировать опт-аут

**Files:**
- Modify: `package.json` (скрипты `dev`, `dev_local`, `dev:toyota`, `preview`,
  `preview:toyota`, `test_links_local`)
- Modify: `.env.example` (описать `ASTRO_DEV_OPEN`)

**Interfaces:**
- Consumes: `server.host` и интеграцию `dev-host-open` из Task 2 и Task 3.
- Produces: ничего для последующих задач.

- [ ] **Step 1: Убрать флаги из dev/preview-скриптов**

Причина: CLI-флаг `--open` без значения даёт `open = true` и заставил бы Vite
открывать `localhost` вдобавок к нашей интеграции — получились бы две вкладки.
`--host` переезжает в конфиг, чтобы источник истины был один.

| Скрипт | Было | Стало |
| --- | --- | --- |
| `dev` | `astro dev --open --host` | `astro dev` |
| `dev_local` | `astro dev --open --host --config astro.local.config.mjs` | `astro dev --config astro.local.config.mjs` |
| `dev:toyota` | `... && astro dev --open --host --config astro.local.config.mjs` | `... && astro dev --config astro.local.config.mjs` |
| `preview` | `astro preview --open --host` | **не меняем** |
| `preview:toyota` | `... && astro preview --open --host` | **не меняем** |

Preview-скрипты трогать нельзя. У Astro нет хука для preview-сервера — в
`integrations.d.ts` есть только `config:setup`, `config:done`, `server:setup`,
`server:start`, `server:done`, `build:*`, и `server:start` срабатывает лишь в dev.
Preview открывает браузер через `settings.config.server.open`
(`node_modules/astro/dist/core/preview/static-preview-server.js:22`), которое мы
намеренно оставляем `false`. Снять `--open` здесь значило бы просто потерять
автооткрытие без выигрыша: preview отдаёт статику и к симптому с HMR-перезагрузкой
отношения не имеет. Он остаётся на общем origin — осознанно, вне объёма задачи.

Композитные команды (`dd`, `ddl`, `ddol`, `ddolcd`, `ddcars`, `ddlcars`, `ddlcarsl`,
`verify*`) не трогаем — они вызывают `pnpm dev` / `pnpm build`.

- [ ] **Step 2: Защитить `test_links_local` от автооткрытия браузера**

Скрипт поднимает `astro dev --port 4343` и раньше полагался на то, что по умолчанию
браузер не открывается. Теперь открытие делает интеграция, нужен явный опт-аут.

Было:

```json
"test_links_local": "astro dev --port 4343 & sleep 10 && export DOMAIN=localhost:4343 && node .github/scripts/checkLinks/checkLinks.js && pkill -f 'astro dev'",
```

Стало:

```json
"test_links_local": "ASTRO_DEV_OPEN=0 astro dev --port 4343 & sleep 10 && export DOMAIN=localhost:4343 && node .github/scripts/checkLinks/checkLinks.js && pkill -f 'astro dev'",
```

- [ ] **Step 3: Задокументировать переменную в `.env.example`**

Добавить рядом с `DOMAIN_PRESETS`:

```
# Автооткрытие браузера при `pnpm dev`. 0 — не открывать (для автоматических прогонов).
ASTRO_DEV_OPEN=1
```

- [ ] **Step 4: Проверить, что `pnpm dev` открывает нужный URL**

```bash
pnpm dev > /tmp/devopen.log 2>&1 &
sleep 25
grep -i 'Открываю' /tmp/devopen.log
pkill -f 'astro.js dev'
```

Expected: одна строка `Открываю http://<DOMAIN>.localhost:4321/`, открылась
ровно одна вкладка (не две) с сайтом текущего дилера.

- [ ] **Step 5: Проверить отсутствие регрессии сборки**

Run: `pnpm build`

Expected: сборка завершается успешно (идёт несколько минут — дать щедрый таймаут).

- [ ] **Step 6: Коммит**

```bash
/usr/bin/git add package.json .env.example
/usr/bin/git commit -m "chore(dev): move --open/--host into astro config, guard link checker"
```

---

## Разовая уборка после внедрения

Не входит в задачи — выполняется руками один раз, иначе старый мусор на общем
origin продолжит всплывать:

1. DevTools → Application → Storage → **Clear site data** для `http://localhost:4321`.
2. Закрыть усыплённые вкладки Tiny Suspender на `localhost:4321` либо добавить
   `localhost` в исключения расширения.

## Self-Review

**Покрытие спеки:** `readRawDomain()` + `server.host` + интеграция `dev-host-open` —
Task 2; `astro.local.config.mjs` — Task 3; удаление `--open`/`--host` — Task 4 Step 1;
краевые случаи (`localhost`, пусто, протокол, порт, регистр) — Task 1 Step 1.
Критерии приёмки: 1–2 → Task 2 Step 8, 3 → Task 4 Step 4, 6 (второй инстанс) →
Task 2 Step 9, 7 (`dev_local`) → Task 3 Step 6, 8 (`build`) → Task 4 Step 5.
Критерии 4–5 (HMR и изоляция storage) проверяются вручную в браузере — вынесены
в раздел уборки и в приёмку спеки, автоматизации не требуют.

**Отклонения от исходной спеки, внесённые после ревью:**
1. Отказ от `server.open` в пользу хука `astro:server:start` — иначе при занятом
   порте вкладка открывалась бы на чужом инстансе.
2. Добавлены `ASTRO_DEV_OPEN` и правка `test_links_local`: скрипт полагался на
   дефолт `open: false`, который перестаёт действовать.
3. Добавлен Task 3 — `astro.local.config.mjs` дублирует логику домена и не был
   учтён в первой редакции спеки.

**Заглушек нет.** Все шаги содержат готовый код или точные команды. Task 3 Step 2
и Step 4 явно ссылаются на код из Task 2 — это осознанно: блоки идентичны, и
дублирование текста разошлось бы при правках.

**Согласованность имён:** `resolveDevHost` (Task 1) — то же имя в импорте и вызове
в Task 2 и Task 3; `readRawDomain`, `devHost`, `devOpenEnabled`,
`devHostOpenIntegration` объявлены и использованы согласованно в Task 2 и Task 3;
`ASTRO_DEV_OPEN` одинаково пишется в Task 2 Step 3, Task 3 Step 3, Task 4 Step 2–3.
