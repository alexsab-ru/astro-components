# Тестирование обработчика фидов XML

Этот документ описывает, как тестировать обработчик фидов XML для генерации MDX страниц автомобилей.

## 📁 Поддерживаемые форматы

Обработчик поддерживает следующие форматы XML фидов:

1. **Ads-Ad** - Avito формат (корневой элемент `<Ads>`, автомобили в `<Ad>`)
2. **data-cars-car** - CM Expert формат (корневой элемент `<data>`, автомобили в `<cars><car>`)
3. **vehicles-vehicle** - MaxPoster формат (корневой элемент `<vehicles>`, автомобили в `<vehicle>`)
4. **yml_catalog-shop-offers-offer** - YML формат (корневой элемент `<yml_catalog>`, автомобили в `<shop><offers><offer>`)
5. **avtoxml-Offers-Offer** - MaxPoster AvtoXML формат (корневой элемент `<avtoxml>`, автомобили в `<Offers><Offer>`)

## 🚀 Способы тестирования

### 1. Тестирование всех фидов сразу

Запустите скрипт для обработки всех фидов из папки `example`:

```bash
sh .github/scripts/sh/test/test_all_feeds.sh
```

Этот скрипт:
- Обработает все 9 фидов из папки `example`
- Создаст MDX файлы в `src/content/cars/`
- Создаст превью изображений в `public/img/thumbs/`
- Покажет статистику по созданным файлам

### 2. Тестирование одного фида с выбором

Запустите интерактивный скрипт для выбора конкретного фида:

```bash
sh .github/scripts/sh/test/test_single_feed.sh
```

Скрипт покажет список доступных фидов и попросит выбрать номер (1-9).

### 3. Тестирование с явным указанием типа

Если нужно явно указать тип фида:

```bash
sh .github/scripts/sh/test/test_with_type.sh "Ads-Ad" "Ads-Ad.xml"
sh .github/scripts/sh/test/test_with_type.sh "data-cars-car" "data-cars-car--cm.expert.xml"
sh .github/scripts/sh/test/test_with_type.sh "vehicles-vehicle" "vehicles-vehicle--maxposter.xml"
sh .github/scripts/sh/test/test_with_type.sh "yml_catalog-shop-offers-offer" "yml_catalog-shop-offers-offer--cm.expert.xml"
sh .github/scripts/sh/test/test_with_type.sh "avtoxml-Offers-Offer" "avtoxml-Offers-Offer--maxposter.xml"
```

### 4. Ручное тестирование

Можно запустить обработчик вручную:

```bash
# С автоопределением типа
python .github/scripts/update_cars.py \
    --input_file .github/scripts/example/Ads-Ad.xml \
    --output_path .github/scripts/test_results/Ads-Ad.xml \
    --domain localhost:4321

# С явным указанием типа
python .github/scripts/update_cars.py \
    --source_type Ads-Ad \
    --input_file .github/scripts/example/Ads-Ad.xml \
    --output_path .github/scripts/test_results/Ads-Ad.xml \
    --domain localhost:4321
```

## 📊 Просмотр результатов

После обработки фидов:

1. **Запустите сервер разработки:**
   ```bash
   pnpm dev
   ```

2. **Откройте браузер и перейдите по адресу:**
   ```
   http://localhost:4321/cars/
   ```

3. **Проверьте созданные страницы:**
   - Каждый автомобиль будет иметь свою MDX страницу
   - Изображения будут загружены и созданы превью
   - Все данные будут стандартизированы

## 📁 Структура файлов

После обработки создаются:

```
src/content/cars/
├── solaris-krx-16-mt-123-лс-comfort-белый-2025.mdx
├── omoda-s5-15-cvt-113-лс-classic-белый-2024.mdx
└── ...

public/img/thumbs/
├── thumb_solaris-krx-16-mt-123-лс-comfort-белый-2025_71248_0.webp
├── thumb_omoda-s5-15-cvt-113-лс-classic-белый-2024_12345_0.webp
└── ...

.github/scripts/test_results/
├── Ads-Ad.xml
├── data-cars-car--cm.expert.xml
└── ...
```

## 🔧 Настройки

Основные параметры обработчика:

- `--source_type` - тип фида (автоопределяется, если не указан)
- `--input_file` - путь к входному XML файлу
- `--output_path` - путь для сохранения обработанного XML
- `--domain` - домен для генерации URL страниц
- `--cars_dir` - директория для MDX файлов
- `--thumbs_dir` - директория для превью изображений
- `--skip_thumbs` - пропустить создание превью

## 🐛 Отладка

Если возникают проблемы:

1. **Проверьте логи** - обработчик выводит подробную информацию о процессе
2. **Проверьте структуру XML** - убедитесь, что файл соответствует ожидаемому формату
3. **Проверьте права доступа** - убедитесь, что скрипты имеют права на выполнение
4. **Проверьте зависимости** - убедитесь, что установлены все необходимые Python пакеты

## 📝 Примеры использования

### Быстрое тестирование одного фида:
```bash
sh .github/scripts/sh/test/test_single_feed.sh
# Выберите 1 для тестирования Ads-Ad.xml
```

### Тестирование конкретного формата:
```bash
sh .github/scripts/sh/test/test_with_type.sh "data-cars-car" "data-cars-car--cm.expert.xml"
```

### Полное тестирование всех форматов:
```bash
sh .github/scripts/sh/test/test_all_feeds.sh
```

После любого из этих тестов запустите `pnpm dev` и откройте `http://localhost:4321/cars/` для просмотра результатов. 