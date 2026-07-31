# Регрессионная проверка Calltouch

Этот документ описывает периодическую проверку цепочки заявок для сайтов на
`astro-components`. Цель проверки — подтвердить, что одна отправка формы создаёт
не более одной сущности в Calltouch, серверный fallback не теряет обычную
заявку, а UTM и уведомления доходят по ожидаемому маршруту.

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
   │  ├─ уведомления из notifications.ct_callback
   │  └─ Calltouch Lead API не вызывается
   ├─ Client Callback API: technical_failure
   │  └─ технический POST в PHP
   │     ├─ Server Callback API: success
   │     │  ├─ один callback в Calltouch
   │     │  ├─ уведомления из notifications.ct_callback
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

`ct_callback=true` означает только подтверждённый клиентский callback. Это не
команда PHP повторно вызвать Callback API. `ctw_createRequest` может приниматься
для совместимости со старым клиентом, но не участвует в решении.

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
single-project и multi-project. Любой тест должен использовать mock Calltouch и
не обращаться к внешнему API.

### `lead`

```bash
cd /Users/Alexsab/Documents/astro-main/lead
php tests/request_handler_antispam_test.php
find tests -maxdepth 1 -name 'request_handler_*_test.php' -print -exec php {} \;
php -l app/Modules/RequestHandler.php
php -l app/Modules/UnifiedModule.php
php -l app/Services/CallTouchClass.php
php -l changan/avtoforum/index.php
```

Ожидается успешная decision matrix для client success, technical fallback,
business rejection, server failure, spam и `test_phones`. Все внешние вызовы
Calltouch и отправки Telegram/MAX/email в тестах должны быть замоканы.

### `astro-components`

```bash
cd /Users/Alexsab/Documents/astro-main/astro-components
node --test src/blocks/forms/callback/callback.test.mjs
DOMAIN=dev.alexsab.ru pnpm verify
```

После добавления отдельных тестов интеграции Calltouch включить их в этот запуск.
Проверить, что тесты охватывают `connectForms`, форму с файлами, ChatWidget и
TradeInCalc, а также единственный салон и выбор салона в multi-project.

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
| Невалидный телефон | нет | нет | нет | Клиент показывает ошибку; сетевых запросов отправки нет |
| Валидная фикстура, client success | один client | нет | `ct_callback` | Ровно один callback, PHP получает `client_success` |
| Spam-like фикстура, client success | callback может быть уже принят | нет | без дилерских уведомлений | PHP отвечает `attention=true`, spam не восстанавливает получателей |
| `79000000000`, client success | один client | нет | только callback test/webmaster Telegram | Нет email, MAX и дилерского Telegram |
| Technical failure, валидная фикстура | один server | нет | `ct_callback` | PHP получает `technical_failure`, fallback успешен |
| Technical failure, обычный spam | нет | нет | нет | Сервер не обходит антиспам |
| Technical failure, `79000000000` | один server | нет | только callback test/webmaster Telegram | Разрешён только явно настроенный test phone |
| Business rejection | server retry нет | один Lead API только для принятого не-spam лида | обычные | Нет второй попытки Callback API |
| Server fallback failed | нет | один Lead API для принятого не-spam лида | обычные | Ошибка Calltouch не превращает PHP-заявку в ошибку формы |
| Нет `routeKey` | нет | один Lead API для принятого не-spam лида | обычные | Callback не предпринимается, заявка не теряется |

Для каждой строки проверить:

1. Network-запрос клиента и поля `ct_callback_status`,
   `ct_callback_error_code`, `ct_callback_id`, `ct_submission_id`,
   `ct_session_id`, `ct_route_key`, `ct_mod_id`, `ct_site_id`.
2. JSON-ответ PHP в `calltouch_callback.status/source/code`.
3. «Очередь на обратные звонки».
4. «Журнал звонков» и объединённый «Журнал лидов».
5. Отсутствие пары «callback + отдельная заявка» для одной отправки.
6. Telegram, MAX и email согласно ожидаемому событию.

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
→ service
→ credit
→ ct_callback
→ antispam
```

Проверить три состояния каждого override: отсутствует, заполнен, пустой.

| Канал | Обычный лид | Callback success | Обычный spam | Calltouch test phone |
| --- | --- | --- | --- | --- |
| Telegram `to` | обычный маршрут | `ct_callback.telegram.to` | нет | нет |
| Telegram `test` | обычный test-маршрут | `ct_callback.telegram.test` | нет | да |
| Глобальный webmaster | да | да | нет | да |
| MAX `to/test` | обычный маршрут | `ct_callback.max` | нет | нет |
| Email `to/cc/bcc` | обычный маршрут | `ct_callback.email` | нет | нет |
| Email `subject/name_from` | обычные значения | частичный callback override | — | — |

Отсутствующий ключ наследует текущее значение, присутствующий заменяет его,
пустой массив отключает соответствующий список. Пустые `to/cc/bcc` должны
пропускать вызов почтового транспорта без SMTP-ошибки.

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
scripts версия / SHA:
lead SHA:

Телефон: 79000000000 | fixture-only
ct_submission_id:
ct_callback_status / source / code:
ct_callback_id:
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
- схемы аналитических событий `form_success`, `form_attention` или Calltouch
  Lead API;
- версии `@alexsab-ru/scripts` в `astro-components`.

Полную матрицу запускать перед production rollout изменений Calltouch. При
изменении только одного семейства форм допустим сокращённый прогон этого
семейства, но client success, technical fallback и отсутствие дубля обязательны.

## Квартальный чеклист

- [ ] Зафиксированы текущие SHA и опубликованная версия `scripts`.
- [ ] Автоматические проверки трёх репозиториев зелёные.
- [ ] Сверены `routeKey`, `mod_id`, `site_id` одного и нескольких салонов.
- [ ] Проверен client callback с `79000000000`.
- [ ] Проверен server fallback с session ID.
- [ ] Проверен server fallback без session ID и с прямыми UTM.
- [ ] Проверен business rejection без server retry.
- [ ] Проверены invalid, spam-like и test-phone маршруты.
- [ ] Проверены Telegram, MAX и email overrides.
- [ ] В журнале нет пары «callback + Lead API» для одной отправки.
- [ ] Каждый `server_success` содержит `callback_request_id` и подтверждён в
      очереди/журнале Calltouch.
- [ ] Заполнены свидетельства с callback ID и результатами.
- [ ] Все временные блокировки скриптов и отладочные настройки отключены.
- [ ] Секреты и персональные данные не попали в коммиты или отчёт.
