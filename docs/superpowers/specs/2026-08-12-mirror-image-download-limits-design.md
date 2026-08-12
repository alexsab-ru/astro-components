# Лимиты скачивания зеркалируемых фото + чтение MIRROR_* из env.json

Дата: 2026-08-12

## Задача

1. Ввести настраиваемый лимит «сколько новых фото скачивать за один прогон на одно авто» для **обычных** (не-Avito) URL. Сейчас лимит есть только для `avito.ru/autoload/`.
2. Сделать все `MIRROR_*` переменные читаемыми не только из GitHub `vars`, но и из `.env` / `src/data/site/env.json` — как остальная конфигурация проекта.

## Исходное состояние

- `MirrorConfig.avito_autoload_max_new_per_car` (default 1) — единственный лимит; счётчик `_AVITO_AUTOLOAD_DOWNLOADS_BY_CAR` по ключу `(site, category, vin)`, живёт в рамках процесса.
- Обычные URL скачиваются без ограничения: сколько картинок изменилось (по `etag`/`last-modified`/`content-length`) — столько и качается.
- `MIRROR_CAR_IMAGES` и `MIRROR_AUTOLOAD_DOWNLOAD_DELAY_SECONDS` читаются в workflow **только** из `vars.*`. Хуже того, step-level `env: MIRROR_CAR_IMAGES: ${{ vars.MIRROR_CAR_IMAGES }}` затирает пустой строкой значение, которое шаг `Load env.json into environment` уже положил в `$GITHUB_ENV`. То есть env.json для них сейчас не просто игнорируется — он ломается.
- `MIRROR_AVITO_AUTOLOAD_DOWNLOAD_DELAY_SECONDS` не существует. Есть только `MIRROR_AUTOLOAD_DOWNLOAD_DELAY_SECONDS`, и вопреки имени она применяется ко **всем** скачиваниям: `wait_before_image_download()` вызывается в любой ветке `if regenerate:`.
- В `utils.py` уже есть `get_env_value()` с приоритетом `os.environ > .env > src/data/site/env.json` — готовый резолвер, который питон-часть просто не использует для `MIRROR_*`.

## Решение

### Переменные

| переменная | что ограничивает | дефолт |
|---|---|---|
| `MIRROR_CAR_IMAGES` | включает зеркалирование | выкл |
| `MIRROR_AUTOLOAD_DOWNLOAD_DELAY_SECONDS` | пауза между любыми скачиваниями, сек | 1 |
| `MIRROR_MAX_NEW_IMAGES_PER_CAR` | новые скачивания с обычных (не-Avito) URL, на авто за прогон | 5 |
| `MIRROR_AVITO_AUTOLOAD_MAX_NEW_PER_CAR` | новые скачивания с `avito.ru/autoload/`, на авто за прогон | 1 |

Приоритет источников: **`vars` > `.env` > `env.json` > дефолт в коде**. env.json — база; vars остаётся точечным override.

`0` означает «без лимита». Счётчики двух лимитов независимы: Avito-картинки тратят только avito-лимит, обычные — только общий. Ключ счётчика — `(site, category, vin)`, сбрасывается вместе с процессом.

### Поведение при исчерпании общего лимита

Для обычных URL, в отличие от avito-ветки, картинку **нельзя просто выбросить**: у неё, как правило, уже есть отзеркалированная предыдущая версия (лимит срабатывает на «изменилась», а не на «новая»). Поэтому:

- если у картинки есть существующая запись в манифесте с `cdn` — оставляем прошлую версию как есть (`regenerate = False`, `version`/metadata берём из существующей записи), чтобы на следующем прогоне она снова попала в кандидаты на обновление;
- если существующей записи нет — картинка пропускается (как в avito-ветке).

Avito-ветка не меняется.

## Изменения по файлам

1. **`.github/scripts/image_mirror.py`**
   - Константы `DEFAULT_MAX_NEW_IMAGES_PER_CAR = 5`, `DEFAULT_AVITO_AUTOLOAD_MAX_NEW_PER_CAR = 1`.
   - Новый модульный счётчик `_IMAGE_DOWNLOADS_BY_CAR` рядом с avito-счётчиком.
   - `MirrorConfig`: поле `max_new_images_per_car: int = 5`.
   - Единый ключ `car_download_key(vin)`; регистрация скачивания разводит счётчики по `is_avito_autoload`.
   - Проверка общего лимита в блоке `if regenerate:` по правилам выше.
   - Резолвер настроек `resolve_setting(key, default)` с цепочкой `os.environ > .env > src/data/site/env.json`; используется в дефолтах CLI и в `env_value()` для `CDN_BASE_URL`.
   - Новый CLI-флаг `--max_new_images_per_car`; у `--avito_autoload_max_new_per_car` дефолт начинает читаться из переменной.

2. **`.github/scripts/update_cars.py`**
   - Новый аргумент `--mirror_max_new_images_per_car`.
   - Дефолты `--mirror_max_new_images_per_car`, `--mirror_avito_autoload_max_new_per_car`, `--mirror_autoload_download_delay_seconds` резолвятся через `get_env_value(...)` вместо `os.getenv(...)`.

3. **`.github/scripts/utils.py`**
   - Прокинуть `max_new_images_per_car` в `MirrorConfig` тем же паттерном, что уже есть у avito-поля.

4. **`.github/workflows/update_cars.yml`**
   - `if: ${{ vars.MIRROR_CAR_IMAGES == 'true' }}` → `if: ${{ (vars.MIRROR_CAR_IMAGES || env.MIRROR_CAR_IMAGES) == 'true' }}` в шагах скачивания манифестов и загрузки на CDN.
   - Все step-level `env:` для `MIRROR_*` → `${{ vars.X || env.X }}`, чтобы пустой vars не затирал env.json.
   - Флаги в `mirror_args` добавляются только при непустом значении — иначе работают дефолты в питоне.

`vars.DOMAIN` и `vars.UPDATE_CARS` не трогаем: они нужны до того, как env.json вообще скачан.

## Проверка

- `python -c "import ast, pathlib; ..."` / компиляция изменённых скриптов.
- `actionlint` или `python -c "import yaml; yaml.safe_load(...)"` на workflow.
- Локальный dry-run `image_mirror.py --dry-run` с разными значениями лимита.
