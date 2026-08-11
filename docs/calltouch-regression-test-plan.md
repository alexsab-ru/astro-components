# Регрессионная проверка Calltouch

Этот документ описывает периодическую проверку цепочки заявок для сайтов на
`astro-components`. Цель проверки — подтвердить, что одна отправка формы создаёт
не более одной сущности в Calltouch, серверный fallback не теряет обычную
заявку, а UTM и уведомления доходят по ожидаемому маршруту.

Документ описывает целевой контракт, а не состояние одной ветки. Исторические
цифры rollout вынесены в отдельный датированный раздел и не заменяют проверку
текущего кода и production-бандла.

Проверять необходимо все четыре семейства форм:

- обычные формы, подключённые через `connectForms`;
- формы с файлами;
- ChatWidget;
- TradeInCalc.

## Безопасность тестов

- На production разрешён только специально настроенный телефон
  `79000000000`. Перед запуском убедиться, что он присутствует в
  `module_options['calltouch']['test_phones']` нужного endpoint.
- Не использовать на production случайно придуманные «валидные» телефоны: они
  могут принадлежать реальным людям.
- `VALID_PHONE`, `SPAM_PHONE` и другие фикстуры допустимы только в
  автоматических тестах с замоканными HTTP-вызовами.
- Не включать в отчёт API-токены, cookie, полные session ID и конфигурацию
  `app/env.php`. Для связки результатов достаточно последних 6 символов
  session ID.
- Перед ручной отправкой проверить домен, выбранного дилера, `routeKey`,
  `mod_id`, `site_id` и список уведомлений.
- Не проверять сценарий полностью отключённого JavaScript: он не входит в
  поддерживаемый поток.

## Ожидаемое дерево обработки

```text
Клиентская валидация
├─ ошибка
│  └─ нет PHP POST, Callback API и Lead API
└─ форма валидна
   ├─ Client Callback API: success
   │  ├─ один callback в Calltouch
   │  ├─ технический POST в PHP
   │  ├─ уведомления из notifications.events.calltouch_callback_created
   │  └─ Calltouch Lead API не вызывается
   ├─ Client Callback API: technical_failure
   │  └─ технический POST в PHP
   │     ├─ Server Callback API: success
   │     │  ├─ один callback в Calltouch
   │     │  ├─ уведомления из notifications.events.calltouch_callback_created
   │     │  └─ Calltouch Lead API не вызывается
   │     └─ Server Callback API: failure
   │        ├─ обычная обработка PHP-заявки
   │        ├─ обычные уведомления
   │        └─ один Calltouch Lead API для принятого не-spam лида
   └─ Client Callback API: rejected
      ├─ Server Callback API не повторяется
      ├─ обычная обработка PHP-заявки
      ├─ обычные уведомления
      └─ один Calltouch Lead API для принятого не-spam лида
```

`technical_failure` включает отсутствующий или заблокированный Calltouch-скрипт,
таймаут, сетевую ошибку, `unknown_error` и `server_error`. Blacklist, throttle,
ошибка валидации и выключенный или не найденный виджет относятся к `rejected`:
сервер не должен повторять такой запрос.

Новый клиент отправляет только структурированный контракт и **не отправляет**
`ct_callback=true` или `ctw_createRequest`. Сервер временно принимает эти поля
только от старых бандлов: `ct_callback=true` трактуется как legacy-доказательство
client success, а `ctw_createRequest` не участвует в решении. Появление любого
из них у актуальной версии бандла — регрессионная ошибка.

Каждый новый клиентский POST содержит `ct_client_version`, автоматически
полученный из версии `@alexsab-ru/scripts`. Это служебная телеметрия: поле должно
оставаться в wire/raw audit, но не попадать в Telegram, MAX, email, Google Sheets
или параметры аналитического события.

## Автоматические проверки

Запускать из соответствующих репозиториев. Перед первым запуском сохранить SHA:

```bash
git rev-parse HEAD
```

### `scripts`

```bash
cd /Users/Alexsab/Documents/astro-main/scripts
pnpm test
```

Тесты должны покрывать success, delayed `ctw`, отсутствие скрипта, общий
таймаут, network/server error, business rejection, получение session ID,
single-project и multi-project. Дополнительно они подтверждают, что wire содержит
`ct_client_version`, не содержит `ct_callback`/`ctw_createRequest`, а
`sendCalltouchLead` остаётся внутренним решением и не попадает в `dataLayer`,
GA4 или Метрику. Любой тест должен использовать mock Calltouch и не обращаться
к внешнему API.

Перед выпуском сверить версию в `package.json`, SHA тестируемого коммита и
содержимое `npm pack --dry-run`. Тегирование и `npm publish` выполняет владелец
проекта; автоматическая проверка или Codex не публикуют пакет.

Для release evidence отдельно записать:

- соответствие тега `v0.17.4` коммиту `d282920`;
- наличие `0.17.4` в registry после публикации владельцем;
- версию в lockfile потребителя и `ct_client_version` реально загруженного
  browser bundle.

На ранней точке `2026-08-01` локальный тег `v0.17.4` уже указывал на `d282920`,
но registry ещё не находил эту версию. Позже в тот же день владелец опубликовал
`@alexsab-ru/scripts@0.17.4`, а
[scripts PR #7](https://github.com/alexsab-ru/scripts/pull/7) был слит в `main`
merge-коммитом `56b65043`. Оба утверждения — датированные release evidence, а
не доказательство production rollout: перед каждым выпуском состояние registry
и реально загруженный browser bundle проверяются заново.

### `lead`

```bash
cd /Users/Alexsab/Documents/astro-main/lead
npm test
npm run lint
npm run test:notifications
npm run test:deploy
npm run test:bot-config-deploy
npm run test:gateway-deploy
npm run test:app-code-deploy
```

Ожидается успешная decision matrix для client success, technical fallback,
business rejection, server failure, spam и `test_phones`. Все внешние вызовы
Calltouch и отправки Telegram/MAX/email в тестах должны быть замоканы.

`npm test` включает контракты callback outcome и gateway для `tg`, `gsheet`,
`requests` и входящего `calltouch/index.php`. `npm run test:notifications`
должен вывести `Notification snapshots match for 56 endpoints.` и подтвердить
канонический recipient snapshot без секретов. Изменять fixture через
`php tools/notification-config-snapshot.php --write` разрешено только после
ручного просмотра recipient diff.

Для узкого повторного прогона gateway-контрактов:

```bash
php tests/tg_relay_routing_test.php
php tests/gsheet_relay_routing_test.php
php tests/requests_gateway_config_test.php
php tests/calltouch_gateway_routing_test.php
```

Для локальной копии production `requests/requests.json` дополнительно выполнить:

```bash
npm run audit:requests-notifications -- /absolute/path/to/requests.json
```

Ожидаются `route_count: 71`, `recipient_parity: true`, а также записанные в
свидетельства `config_sha256` и `routing_sha256`. Количество 71 — контрольный
rollout-инвариант текущего production-файла, а не разрешение молча принять
добавление или удаление маршрута: любое изменение сначала сверяется с владельцем
конфигурации.

### `astro-components`

```bash
cd /Users/Alexsab/Documents/astro-main/astro-components
node --test src/blocks/forms/callback/callback.test.mjs
DOMAIN=dev.alexsab.ru pnpm verify
```

После добавления отдельных тестов интеграции Calltouch включить их в этот запуск.
Проверить, что тесты охватывают `connectForms`, форму с файлами, ChatWidget и
TradeInCalc, а также единственный салон и выбор салона в multi-project.

Сборку следует запускать с той же опубликованной версией
`@alexsab-ru/scripts`, которая будет в production. Значение
`ct_client_version` в тестовом POST должно совпасть с версией реально
загруженного браузером бандла, а не только с lockfile.

На `2026-08-01` обновление Astro-потребителя до `0.17.4` подготовлено коммитом
`452502ad` в
[draft PR #119](https://github.com/alexsab-ru/astro-components/pull/119).
Коммит прошёл focused-тесты и Astro production build на локальном снимке данных
Changan, но открытый draft PR сам по себе не означает merge или deployment.

Успешная сборка сама по себе не заменяет ручную проверку Calltouch.

## Ручная тестовая матрица

Перед каждой строкой добавить уникальные UTM и записать время с часовым поясом.
Сначала выполнять сценарии на `dev.alexsab.ru`; production-сценарии выполнять
только на `avto.avtoforum-changanauto.ru` и только с `79000000000`.

Демо-виджет на `dev.alexsab.ru` может быть выключен в кабинете Calltouch.
В этом состоянии ожидается `rejected`: PHP POST не теряется, а server fallback
без настроенного demo API token не запускается. Это корректная проверка отказа,
но не проверка успешного callback.

| Сценарий | Callback API | Calltouch Lead API | PHP и уведомления | Ожидаемый результат |
| --- | --- | --- | --- | --- |
| Невалидный телефон | нет | нет | нет | Клиент показывает ошибку; сетевых запросов отправки нет. После исправления номера в той же форме повторный submit должен стать доступен без перезагрузки страницы |
| Валидная фикстура, client success | один client | нет | `events.calltouch_callback_created` | Ровно один callback, PHP получает `client_success` |
| Spam-like фикстура, client success | callback может быть уже принят | нет | без дилерских уведомлений | PHP отвечает `attention=true`, spam не восстанавливает получателей |
| `79000000000`, client success | один client | нет | только callback test/webmaster Telegram | Нет email, MAX и дилерского Telegram |
| Technical failure, валидная фикстура | один server | нет | `events.calltouch_callback_created` | PHP получает `technical_failure`, fallback успешен |
| Technical failure, обычный spam | нет | нет | нет | Сервер не обходит антиспам |
| Technical failure, `79000000000` | один server | нет | только callback test/webmaster Telegram | Разрешён только явно настроенный test phone |
| Business rejection | server retry нет | один Lead API только для принятого не-spam лида | обычные | Нет второй попытки Callback API |
| Server fallback failed | нет | один Lead API для принятого не-spam лида | обычные | Ошибка Calltouch не превращает PHP-заявку в ошибку формы |
| Нет `routeKey` | нет | один Lead API для принятого не-spam лида | обычные | Callback не предпринимается, заявка не теряется |

Для каждой строки проверить:

1. Network-запрос клиента и поля `ct_callback_status`,
   `ct_callback_error_code`, `ct_callback_id`, `ct_submission_id`,
   `ct_session_id`, `ct_route_key`, `ct_mod_id`, `ct_site_id` и
   `ct_client_version`. У актуального бандла нет `ct_callback` и
   `ctw_createRequest`.
2. JSON-ответ PHP имеет одну форму для сайта и ботов:
   `calltouch_callback.status/source/code` плюс необязательный
   `callback_request_id`.
3. «Очередь на обратные звонки».
4. «Журнал звонков» и объединённый «Журнал лидов».
5. Отсутствие пары «callback + отдельная заявка» для одной отправки.
6. Telegram, MAX и email согласно ожидаемому событию.

Канонический PHP outcome:

```json
{
  "calltouch_callback": {
    "status": "client_success|server_success|failed|not_attempted",
    "source": "client|server|bot|none",
    "code": "string",
    "callback_request_id": "optional"
  }
}
```

`source=bot` — расширение enum для Telegram-, MAX- и Eservice-ботов. Успешный
ботовый callback всё равно имеет `status=server_success`; отдельного
`bot_success` нет. Сырой transport answer, callback payload, токены и stack
trace в публичный ответ не входят.

`server_success` подтверждён только при одновременном выполнении двух условий:

1. PHP вернул непустой `calltouch_callback.callback_request_id`.
2. Этот ID или соответствующий ему callback найден в очереди/журнале Calltouch.

HTTP `2xx` без `callbackRequestId` фиксируется как
`failed / invalid_success_response`, а не как успешный callback.

## Проверка UTM и привязки визита

Использовать уникальный набор на каждый сценарий, например:

```text
utm_source=codex-regression
utm_medium=e2e
utm_campaign=calltouch-YYYYMMDD
utm_content=<client|server-session|server-direct>
utm_term=<короткий-id-сценария>
```

### 1. Client callback

1. Открыть страницу по URL со всеми пятью UTM.
2. Дождаться загрузки счётчика Calltouch.
3. Отправить форму с `79000000000`.
4. Подтвердить `ct_callback_status=success`, `source=client` и наличие session ID.
5. В Calltouch проверить источник и все UTM у callback.
6. Убедиться, что отдельной записи Lead API нет.

### 2. Server fallback с session ID

1. Оставить tracking-счётчик доступным.
2. Заблокировать только Callback API или принудительно получить
   `technical_failure`, не блокируя получение session ID.
3. Отправить форму.
4. Подтвердить `source=server`, наличие маскированного session ID и один callback.
5. Проверить, что визит и UTM связаны с callback через сессию.

### 3. Server fallback без session ID

1. Заблокировать Calltouch-скрипты, но оставить основной JavaScript сайта и PHP
   endpoint доступными.
2. Открыть страницу с пятью уникальными UTM.
3. Отправить форму.
4. Подтвердить `source=server` и отсутствие session ID.
5. Проверить в Calltouch прямую передачу `utmSource`, `utmMedium`,
   `utmCampaign`, `utmContent`, `utmTerm` и `callUrl`.

Если Calltouch принял клиентский callback, но браузер потерял ответ, возможен
редкий дубль при server fallback: Callback API не предоставляет idempotency key.
Такой случай фиксировать отдельно как известное ограничение, сохраняя оба
callback ID.

## Проверка маршрутизации уведомлений

Порядок применения конфигурации:

```text
notifications.telegram / notifications.max / notifications.email
→ notifications.events.service
→ notifications.events.credit
→ notifications.events.calltouch_callback_created
→ antispam
```

Проверить три состояния каждого override: отсутствует, заполнен, пустой.

| Канал | Обычный лид | Callback success | Обычный spam | Calltouch test phone |
| --- | --- | --- | --- | --- |
| Telegram `to` | обычный маршрут | `events.calltouch_callback_created.telegram.to` | нет | нет |
| Telegram `test` | обычный test-маршрут | `events.calltouch_callback_created.telegram.test` | нет | да |
| Глобальный webmaster | да | да | нет | да |
| MAX `to/test` | обычный маршрут | `events.calltouch_callback_created.max` | нет | нет |
| Email `to/cc/bcc` | обычный маршрут | `events.calltouch_callback_created.email` | нет | нет |
| Email `subject/name_from` | обычные значения | частичный callback override | — | — |

Отсутствующий ключ наследует текущее значение, присутствующий заменяет его,
пустой массив отключает соответствующий список. Пустые `to/cc/bcc` должны
пропускать вызов почтового транспорта без SMTP-ошибки.

## Rollout-снимок, не нормативный контракт

На `2026-08-01` в ветке `lead/codex/notification-legacy-migration` на коммите
`bc0d411` 49 из 56 `RequestHandler` endpoint уже задавали `$notifications`, а
семь ещё проходили через legacy-adapter. Это только историческая точка сверки:
документ нельзя обновлять под это число после каждой волны и нельзя считать
миграцию завершённой по нему.

На более поздней точке `2026-08-01`, integration HEAD `fb44395`, snapshot
содержал 52 канонических и 4 legacy endpoint. Оставшиеся четыре:
`changan/engels`, `samtermy`, `tank/penza` и `wey/penza`. Их зависимости и DoD
зафиксированы в `lead/LEGACY_INTEGRATION_REMOVAL_PLAN.md`. Это также
историческое свидетельство, а не замена актуального snapshot.

На той же промежуточной точке exact shared-app manifest содержал 24 tracked PHP
пути (полный SHA-256 файла
`d401e09a54162dfd001c9fc76a91db4ec583d96619eb0dea9faa2e2bcbf1ee94`).
Это датированный 24-path milestone до включения Eservice, а не текущая
deployment-норма.

Текущее локальное состояние на `2026-08-01` зафиксировано в `lead` коммитом
`a246e40`: recipient snapshot содержит 56 канонических и 0 legacy endpoint.
Eservice переведён коммитом `2366ae6` на canonical bot flow с явным
`calltouch.mode=disabled`. Пользователь подтвердил и локальная ветка реализует
три решения:

1. tracked bearer/SMTP-секреты вынесены в игнорируемый `app/env.php`, а stale
   закомментированный SMTP-блок удалён;
2. Calltouch для Eservice отключён до появления рабочих реквизитов, Telegram
   сохранён;
3. все `ct_*`, включая `ct_callback_id`, остаются в raw audit и не создают поля
   Google Sheets.

Пакет `@alexsab-ru/scripts@0.17.4` опубликован владельцем, scripts PR #7 слит,
а Astro consumer commit `452502ad` находится в draft PR #119. Production rollout
этой локальной готовности и 14-дневное telemetry window ещё не начинались.

Актуальное состояние всегда подтверждается командами:

```bash
npm run test:notifications
php tools/notification-config-snapshot.php --check
```

Inventory обязан содержать ровно 56 endpoint, пока отдельным изменением не
согласован новый состав. Все 56 сейчас должны иметь
`configuration_source=notifications`. Готовность удаления adapter доказывается
не только этим snapshot, но также отсутствием legacy-конфигураций в ботах и
gateway, а затем 14-дневной production-телеметрией — не историческими числами
49/56 или 52/4.

## Проверка gateway и восстановление production

Перед любым production-изменением записать commit SHA и выполнить локальные
gateway-тесты:

```bash
npm test
npm run test:gateway-deploy
npm run test:deploy
npm run test:bot-config-deploy
npm run test:app-code-deploy
```

Порядок rollout зависимостей фиксирован: сначала exact shared `app/`, затем
зависящие от него bot configs и только после этого dealer/brand endpoint и
gateway. Broad-команда `app_sync` не используется для этой миграции.

Shared PHP выкладывается только по текущему проверенному manifest из 25
tracked-файлов. Он покрывает reviewed rollout через Eservice commit `2366ae6`;
sorted inventory SHA-256 равен
`30efe316777888a39a25cd6fc67a90c206655b9044b0eea61e70b9c69c978338`, а
SHA-256 полного manifest-файла —
`b37db0c12abfb4f615ba80858d24b68fb58932f15feef5874d4e44f0932bb249`:

```bash
npm run app_code_backup -- \
  deploy/app-code-manifests/calltouch-notification-migration.txt --dry-run
npm run app_code_sync -- \
  deploy/app-code-manifests/calltouch-notification-migration.txt --dry-run
npm run app_code_backup -- \
  deploy/app-code-manifests/calltouch-notification-migration.txt
npm run app_code_sync -- \
  deploy/app-code-manifests/calltouch-notification-migration.txt
npm run app_code_restore -- \
  deploy/app-code-manifests/calltouch-notification-migration.txt \
  <backup-id> --dry-run
# Только при откате после проверки restore dry-run:
npm run app_code_restore -- \
  deploy/app-code-manifests/calltouch-notification-migration.txt \
  <backup-id>
```

Sync dry-run обязан перечислить каждый из 25 exact path как `create`, `update`
или `unchanged`. Backup хранится вне webroot; restore восстанавливает состояние
`present` и удаляет только exact-файлы, записанные как `missing`, предварительно
создавая отдельный pre-restore backup. В свидетельствах сохранить commit SHA,
manifest, оба проверенных SHA-256, ручной и автоматический backup ID, dry-run с
итогами create/update/unchanged и точную restore-команду.

После успешного shared-app rollout и его проверки теми же правилами выполняются
allowlisted `bot_config_backup/sync/restore`, затем endpoint workflow ниже.

Для каждого изменяемого dealer/brand endpoint процедура отдельная:

```bash
npm run endpoint_sync -- changan/avtoforum --dry-run
npm run endpoint_backup -- changan/avtoforum
npm run endpoint_sync -- changan/avtoforum
npm run endpoint_restore -- changan/avtoforum <backup-id> --dry-run
# Только при откате после проверки dry-run:
npm run endpoint_restore -- changan/avtoforum <backup-id>
```

В отчёте сохранить `backup-id`, dry-run diff и точную restore-команду. Sync
копирует только tracked `index.php`; `app/env.php` и runtime-файлы не должны
попасть в rsync. Shared `app/` выкладывается раньше endpoint, который зависит от
нового класса или factory.

Для `requests/index.php` код и runtime-конфигурация разделены. Код проходит тот
же endpoint workflow, а `requests.json` — только allowlisted
`requests_config_backup/sync/restore`. Перед переключением gateway обязательны
71-route audit и сохранение обоих SHA-256.

```bash
npm run requests_config_backup -- --dry-run
npm run requests_config_sync -- --dry-run
npm run requests_config_backup
# Sync — только после проверки audit, хэшей и dry-run:
npm run requests_config_sync
npm run requests_config_restore -- <backup-id> --dry-run
# Только при откате после проверки dry-run:
npm run requests_config_restore -- <backup-id>
```

Legacy `webhook/` выводится из эксплуатации только recoverable move всей папки,
включая игнорируемый `cloudmailin.json`:

```bash
npm run webhook_backup -- --dry-run
npm run webhook_backup
npm run webhook_retire -- --dry-run
# Только после отдельного подтверждения production-операции:
npm run webhook_retire
npm run webhook_restore -- <retire-backup-id> --dry-run
# Только при откате после проверки dry-run:
npm run webhook_restore -- <retire-backup-id>
```

Retirement не затрагивает `app/Services/Webhooks` и соседние gateway. Исходный
commit и production backup независимы: Git revert возвращает код, а
`webhook_restore` — полную production-папку.

## 14-дневная телеметрия перед удалением legacy

По состоянию на `2026-08-01` production deploy телеметрии и единый rollout
нового client bundle не выполнялись, поэтому observation window не начато и
telemetry gate нельзя считать пройденным. Локальные `56/0` и зелёные тесты не
задают `observation_start` задним числом.

Обычный raw audit заявки и rollout-телеметрия решают разные задачи:

- raw audit хранит поля конкретного запроса, включая `ct_client_version` и
  callback ID, и нужен для расследования единичного лида;
- доказательство «за 14 дней не было legacy-вызовов» требует отдельного
  централизованного append-only хранилища с безопасной параллельной записью.

Read-modify-write JSON в `app/Services/Requests/YYYY-MM/` нельзя использовать
как доказательство нулевого количества: параллельные запросы могут потерять
запись. Для этого `lead` пишет append-only JSONL под `LOCK_EX` в игнорируемый
runtime-каталог `app/Services/LegacyTelemetry/`. Событие содержит только UTC
timestamp, закрытый `kind`, безопасный относительный source, допустимую
`ct_client_version` и минимальное решение adapter; телефон, email, получатели,
Calltouch ID, ответы сервисов и ошибки туда не попадают.

Закрытые типы событий:

- legacy-конструктор `RequestHandler`;
- browser wire `ct_callback=true`;
- browser wire `ctw_createRequest`;
- `module_options['calltouch']['ct_callback']`;
- legacy-конструктор `UnifiedModule`;
- relay wire `tg_recipients`.

Начало наблюдения — более поздний из UTC-времени production deploy телеметрии
и завершения rollout нового client bundle на всех активных сайтах. Оно не
считается от merge. Сводка запускается с этим временем явно:

```bash
npm run audit:legacy-telemetry -- \
  --observation-start=2026-08-01T12:00:00Z
```

Отсутствующий runtime-каталог, пропущенный `--observation-start`, неполные 14
суток и хотя бы одна повреждённая или неизвестная запись всегда дают
`gate_passed=false`, даже при `zero_legacy=true`.

Удаление legacy разрешено только после 14 полных последовательных суток, когда:

1. все активные сайты отдают ожидаемую версию бандла;
2. нет новых `ct_callback=true` и `ctw_createRequest` от этой версии;
3. отдельно разобраны запросы без версии, старые кэши, форки, боты и gateway;
4. recipient snapshot не содержит legacy endpoint-конфигураций;
5. сводка возвращает `gate_passed=true` и сохранена с началом, концом, обеими
   rollout-датами и SHA релиза.

`ct_client_version` попадает под общее правило фильтрации `ct_*`: оно остаётся в
wire/audit/telemetry, но намеренно отсутствует в тексте заявки и Sheets.

## Шаблон свидетельств

Копировать блок для каждого ручного сценария:

```text
Дата и время (TZ):
Проверяющий:
Сценарий:
Домен и URL:
Форма: connectForms | files | ChatWidget | TradeInCalc
Выбранный салон:

astro-components SHA:
scripts package.json версия / SHA:
scripts опубликованная версия:
ct_client_version из browser POST:
lead SHA:
production bundle URL / hash или build ID:

Shared app manifest / число путей:
Shared app commit SHA:
Shared app manual / automatic backup ID:
Shared app dry-run create / update / unchanged:
Shared app restore dry-run:
Shared app точная restore-команда:
Bot config backup ID / dry-run / restore-команда:

Телефон: 79000000000 | fixture-only
ct_submission_id:
Client wire ct_callback_status / error_code / source:
Client wire ct_callback_id:
PHP calltouch_callback status / source / code:
PHP callback_request_id:
legacy ct_callback / ctw_createRequest: отсутствуют | обнаружены
legacy telemetry observation_start:
legacy telemetry storage_present / observation_complete:
legacy telemetry total / invalid_records / gate_passed:
session ID (только последние 6 символов):
routeKey:
mod_id / site_id:

UTM source / medium / campaign / content / term:
Callback queue: найдено / не найдено
Call journal: найдено / не найдено
Lead journal: найдено / не найдено
Отдельный Lead API: да / нет

Telegram to/test/webmaster:
MAX to/test:
Email to/cc/bcc:
subject / name_from:

Endpoint recipient snapshot: PASS / FAIL
Requests route_count / config_sha256 / routing_sha256:
Gateway tests: PASS / FAIL / N/A
Production backup ID:
Dry-run результат:
Точная restore-команда:

Telemetry window (UTC start/end):
Legacy events за окно:
Версии бандлов за окно:

Ожидание:
Фактический результат:
Ссылки на скриншоты или лог без секретов:
Итог: PASS | FAIL | KNOWN LIMITATION
```

Скриншоты должны скрывать телефоны других клиентов, токены, cookie и полные
session ID.

## Когда повторять проверку

Запускать автоматические тесты и релевантные ручные сценарии после изменения:

- `@alexsab-ru/scripts`: формы, Calltouch helper, session ID, UTM или campaign
  cookie;
- `RequestHandler`, `UnifiedModule`, `CallTouchClass`, антиспама или уведомлений;
- обычных форм, форм с файлами, ChatWidget или TradeInCalc;
- `salons.json`, `scripts.json`, `routeKey`, `mod_id`, `site_id`;
- Calltouch-виджета, его статуса, проекта или API-токена;
- endpoint дилера и `$notifications`;
- recipient snapshot, bot/gateway boundary или runtime `requests.json`;
- endpoint, bot-config, requests-config или webhook deploy/restore tooling;
- схемы аналитических событий `form_success`, `form_attention` или Calltouch
  Lead API;
- версии `@alexsab-ru/scripts` в `astro-components`.

Полную матрицу запускать перед production rollout изменений Calltouch. При
изменении только одного семейства форм допустим сокращённый прогон этого
семейства, но client success, technical fallback и отсутствие дубля обязательны.

## Квартальный чеклист

- [ ] Зафиксированы текущие SHA и опубликованная версия `scripts`.
- [ ] `ct_client_version` совпадает с реально загруженным production-бандлом.
- [ ] Новый browser POST не содержит `ct_callback` и `ctw_createRequest`.
- [ ] Автоматические проверки трёх репозиториев зелёные.
- [ ] Recipient snapshot совпал для всех 56 endpoint.
- [ ] Runtime `requests.json` прошёл audit 71 маршрута; сохранены config/routing
      SHA-256.
- [ ] Gateway и deploy/restore тесты зелёные.
- [ ] `npm run test:app-code-deploy` прошёл локально.
- [ ] Shared `app/` выведен первым по exact manifest из 25 tracked PHP;
      проверены оба SHA-256, сохранены manual/automatic backup ID, dry-run
      create/update/unchanged и точная restore-команда.
- [ ] Bot configs выведены после shared `app/`, а endpoint — после их
      зависимостей.
- [ ] Сверены `routeKey`, `mod_id`, `site_id` одного и нескольких салонов.
- [ ] Проверен client callback с `79000000000`.
- [ ] Проверен server fallback с session ID.
- [ ] Проверен server fallback без session ID и с прямыми UTM.
- [ ] Проверен business rejection без server retry.
- [ ] Проверены invalid, spam-like и test-phone маршруты.
- [ ] После невалидного submit телефон исправлен в той же форме; ошибка снята,
      повторный submit проходит без перезагрузки страницы.
- [ ] Проверены Telegram, MAX и email overrides.
- [ ] В журнале нет пары «callback + Lead API» для одной отправки.
- [ ] Каждый `server_success` содержит `callback_request_id` и подтверждён в
      очереди/журнале Calltouch.
- [ ] Заполнены свидетельства с callback ID и результатами.
- [ ] Для изменённых endpoint записаны backup ID, dry-run и restore-команда.
- [ ] Если выводился `webhook/`, сохранён backup ID всей папки и проверен
      restore dry-run.
- [ ] Перед удалением legacy закрыто отдельное 14-дневное telemetry window;
      raw audit не использован как замена.
- [ ] Все временные блокировки скриптов и отладочные настройки отключены.
- [ ] Секреты и персональные данные не попали в коммиты или отчёт.
