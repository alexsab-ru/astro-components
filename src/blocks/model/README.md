# Экран модели

`Model.astro` собирает первый экран из самостоятельных компонентов. Вызов
`<Model model={model} breadcrumb={breadcrumb} status={status} />` сохраняет
прежние оформление, порядок, цены, выгоды, цвета и действия.

```astro
<Model
	model={model}
	status="enable"
	parts={{ benefits: false, photos: false }}
	partOrder={['hero', 'characteristics', 'media', 'colors', 'actions']}
	heroOrder={['price', 'heading', 'slogan']}
/>
```

| Часть | Компонент | Назначение |
| --- | --- | --- |
| hero | ModelHero | Фон и компоновка верхней информации |
| heading | ModelHeading | Бренд и название |
| slogan | ModelSlogan | Необязательный слоган |
| price | ModelPrice | Цена с дисклеймером или запрос цены/предзаказ |
| benefits | ModelBenefits | Выгоды с прежними ссылками и метаданными popup |
| media | ModelMedia | Основное изображение первого цвета |
| colors | ModelColorPicker | Переключатели цветов и название цвета |
| photos | ModelPhotos | Полоса фотографий и отдельный Swiper |
| characteristics | ModelCharacteristics | Сетка globalChars |
| actions | ModelActions | Покупка, кредит, тест-драйв, акция, комплектация |
| badge | ModelBadge | Прежнее наложение badge.modelPage |

`partOrder` по умолчанию: `hero, media, colors, photos, characteristics, actions`.
`heroOrder`: `breadcrumb, heading, slogan, price, benefits`. Порядок перемещает
указанные части вперёд; неуказанные сохраняются в конце в исходном порядке.
Повторы и неизвестные ключи игнорируются. Для отключения задайте `parts.key=false`.
ModelHero передаёт Breadcrumbs копию массива: повторные экраны не дописывают
«Главная» во входные данные друг друга.
При отключении всех внешних частей разметка экрана отсутствует.
`badge` остаётся абсолютным наложением и скрывается вместе с `hero`.

`ModelMedia` и `ModelColorPicker` разделены, чтобы менять положение палитры.
При ручной композиции разместите их в одном `section[data-dir]`: существующий
ColorLink переключает изображения и подпись в ближайшем section. Корневой
Model создаёт этот контекст сам. Для нескольких экземпляров одной модели
задайте разные `id`, сохранив `data-dir` модели для старого fallback пути фото.

`ModelPhotos` получает `photos` (готовый массив) либо загружает `model.photos`
прежним способом: значения групп JSON объединяются на один уровень. Когда
часть отключена, её источник не загружается. Ошибки загрузки сохраняют прежнее
поведение сборки. У каждого экземпляра своя группа лайтбокса; `gallery`
позволяет намеренно объединить фото. GLightbox остаётся в общем bootstrap,
Swiper каждой ленты инициализируется отдельно в `model-photos-slider.js`.

У `ModelActions` сохранено условие `status=enable/show || model.show`, флаг
`settings.features.credit` и выбор scroll-link/popup по наличию комплектаций.
`creditEnabled` позволяет явно переопределить этот флаг для отдельного вызова
и тестового примера. Все подписи и data-title/data-form_name сохранены.

## Генерация страницы из JSON

Существующий блок `model` в BlockRenderer принимает `parts`, `partOrder`,
`heroOrder` через `content` или `props` (props приоритетнее). Model/status/
breadcrumb приходят из контекста страницы, их не нужно повторять в JSON.
В стандартном маршруте `pages/models/[...slug].astro` настройки берутся
из `model.page.hero`:

```json
{
  "page": {
    "hero": {
      "parts": {"benefits": false, "photos": false},
      "partOrder": ["hero", "characteristics", "media", "colors", "actions"],
      "heroOrder": ["price", "heading", "slogan"]
    }
  }
}
```

Структура остальных page.blocks и порядок страницы не изменены. Без page.hero
используется прежняя композиция; данные действующих дилеров не переписаны.

Проверка логики: `node --test src/blocks/model/model-layout.test.mjs`.
Guide: `model`, все страницы `model-*` и `model-page-options`.
