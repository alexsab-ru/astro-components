# Свой `*.localhost`-хост на каждый дилерский сайт в dev

Дата: 2026-08-06
Статус: согласовано, готово к планированию

## Проблема

`astro-components` — один шаблон, из которого собирается ~80 дилерских сайтов, и все они
в разработке живут на одном origin `http://localhost:4321`. Браузер ключует по origin
всё, что переживает перезапуск dev-сервера:

- дисковый кэш и back/forward cache,
- `localStorage`, `sessionStorage`, куки,
- снимки усыплённых вкладок (у пользователя стоит расширение Tiny Suspender,
  `bbomjaikkcabgmfaomdichgcodnaeecf`).

Из-за этого страница одного дилера всплывает при разработке другого. Зафиксированный
случай: dev-сервер отдавал `haval-ulyanovsk.ru` (проверено `curl` — 200, `<title>Купить
HAVAL … Тон-Авто`, ноль вхождений `alpha-center`), а вкладка на `http://localhost:4321/`
показывала сайт `alpha-center.ru` («Автосервис в Самаре»). Переход по ссылке с этой
страницы на `/vybrat-novyj-avto/` дал 404 — роут есть у alpha-center и отсутствует
в haval-сборке.

Утечка не ограничивается кэшем: через общий origin между дилерами протекают также
`location_search` из `src/layouts/RedirectPage.astro:102-104` и ключ выбранного домена
dev-тулбара (`dev-toolbar/domain-switch/app.ts:313`).

## Решение

Открывать dev-сервер на хосте, производном от `DOMAIN`:
`haval-ulyanovsk.ru` → `http://haval-ulyanovsk.ru.localhost:4321/`.

Разные хосты — разные origin, поэтому кэш и storage физически не пересекаются.
Chrome и Firefox резолвят любой `*.localhost` в loopback самостоятельно, включая
многоуровневые имена; записи в `/etc/hosts` не нужны.

Ключевое ограничение, определяющее реализацию: macOS **не** резолвит `*.localhost`
на уровне ОС — это делает сам браузер. Поэтому биндить сокет на такое имя нельзя.
Сервер продолжает слушать все интерфейсы, а меняется только URL, который открывается.

## Изменения

### 1. `astro.config.mjs` — общий источник домена + открытие браузера

Сейчас источник домена читается внутри `resolveSiteFromConfig` (строки 31–52) с
приоритетом `src/data/site/scripts.json` → `.env DOMAIN`, и используется только для
`site:`. Выносим общий `readRawDomain()`, которым пользуются и `resolveSiteFromConfig`,
и новый `resolveDevHost()` — чтобы адрес в браузере не мог разойтись с тем, что
реально собирается.

Блок `server` ограничивается биндингом:

```js
server: {
    host: true,     // биндим 0.0.0.0 — заменяет флаг --host
},
```

**`server.open` строкой использовать нельзя.** Это статическое значение, вычисляемое
до `listen()`, а Vite при занятом порте делает `httpServer.listen(++port, host)`
(`isHostAllowedInternal` соседствует с `httpServerStart` в
`node_modules/vite/dist/node/chunks/config.js`). Открытие идёт через

```js
const path = typeof options.open === "string" ? new URL(options.open, url).href : url;
```

где `url` уже содержит реальный порт, но абсолютный URL базу игнорирует. Итог:
второй инстанс слушал бы `:4322`, а вкладку открыл на `:4321` — то есть на чужом,
уже запущенном сайте. Это воспроизводит ровно ту проблему, которую мы устраняем.

Вместо этого — inline-интеграция рядом с существующей `stripDisabledRoutesIntegration`
(строка 186), по тому же паттерну. Хук `astro:server:start` получает `address`
с фактическим портом:

```js
const devHostOpenIntegration = (host) => ({
	name: 'dev-host-open',
	hooks: {
		'astro:server:start': ({ address, logger }) => {
			const url = `http://${host}:${address.port}/`;
			// открываем средствами ОС; кроссплатформенно — в проекте есть start_win
		},
	},
});
```

Автоинкремент порта при этом сохраняется полностью: он зависит только от
`strictPort`, который Astro не выставляет, а у Vite он по умолчанию `false`.

### 2. `astro.local.config.mjs` — то же самое

Файл дублирует логику определения домена и не имеет блока `server`. Через него
работают скрипты `dev_local` и `dev:toyota`, поэтому без правки они остались бы
на общем origin.

### 3. `package.json` — убрать `--open` и `--host` из dev/preview-скриптов

Обязательное условие: CLI-флаг `--open` без значения даёт `open = true` и **перебивает**
конфиг. `--host` переезжает в конфиг, чтобы источник истины был один.

Затрагиваются: `dev`, `dev_local`, `dev:toyota`.

`preview` и `preview:toyota` остаются как есть. У Astro нет интеграционного хука для
preview-сервера, он открывает браузер через `settings.config.server.open`, которое мы
оставляем `false`. Снятие `--open` там просто убрало бы автооткрытие без выигрыша;
preview отдаёт статику и остаётся на общем origin — осознанно, вне объёма задачи.

Композитные команды (`dd`, `ddl`, `ddol`, `ddolcd`, `ddcars`, `ddlcars`, `ddlcarsl`,
`verify*`) правок не требуют — они вызывают `pnpm dev` / `pnpm build`.

## Что сознательно не меняется

- `http://localhost:4321/` и `http://127.0.0.1:4321/` продолжают работать. Меняется
  только автооткрываемый URL, поэтому Safari (который `*.localhost` не резолвит)
  и привычный ручной флоу не ломаются.
- `server.allowedHosts` не настраиваем. Vite 7 пропускает такие хосты по умолчанию —
  `node_modules/vite/dist/node/chunks/config.js`, `isHostAllowedInternal`:
  `if (hostname === "localhost" || hostname.endsWith(".localhost")) return true;`
- Доступ по LAN-IP сохраняется: `host: true` — это и есть прежний `--host`.
- Прод-сборка не затрагивается: `server` действует только в `astro dev` и `astro preview`.

## Краевые случаи

| `DOMAIN` | Хост |
| --- | --- |
| `haval-ulyanovsk.ru` | `haval-ulyanovsk.ru.localhost` |
| `promo.kia-samara.ru` | `promo.kia-samara.ru.localhost` |
| `localhost` (есть в `DOMAIN_PRESETS`) | `localhost` — без `localhost.localhost` |
| пусто или `scripts.json` отсутствует | `localhost` |
| значение с протоколом/портом/путём | нормализуется до голого хоста |

## Критерии приёмки

1. `curl -sD- -H 'Host: haval-ulyanovsk.ru.localhost:4321' http://127.0.0.1:4321/` →
   200 и `<title>` текущего дилера.
2. `curl -s http://localhost:4321/` → по-прежнему 200 (регрессии нет).
3. `pnpm dev` открывает браузер сразу на `http://<DOMAIN>.localhost:4321/`.
4. В браузере на новом хосте HMR-сокет подключается, правка файла даёт корректный
   релоад без подстановки чужого сайта.
5. Смена `DOMAIN` в `.env` + перезапуск `pnpm dev` даёт другой хост, и вкладки
   двух дилеров не видят storage друг друга.
6. **Второй инстанс при занятом 4321** садится на 4322 и открывает браузер именно
   на `:4322`, а не на чужом уже запущенном сайте. Это главный регресс-тест
   к отказу от `server.open`.
7. `pnpm dev_local` (через `astro.local.config.mjs`) ведёт себя так же, как `pnpm dev`.
8. `pnpm build` отрабатывает без изменений поведения.

## Разовое действие после внедрения

Старый мусор на общем origin само не исчезнет. Один раз почистить для
`http://localhost:4321`: DevTools → Application → Storage → Clear site data,
и закрыть усыплённые вкладки Tiny Suspender на этом адресе (либо добавить
`localhost` в его исключения).
