# CardMedia

Общее отображение медиа и содержимого. Компонент не читает модели, цены,
остатки или данные сайта. Кнопки используют CardAction и существующие `.btn`
и `.btn-o`, включая переменные и состояния бренда.

```astro
<CardMedia
	title="Заголовок карточки"
	content="<ul><li>Первое преимущество</li><li>Второе преимущество</li></ul>"
	images={[{ imageUrl: '/photo.webp', alt: 'Описание фотографии' }]}
	buttons={[
		{ title: 'Запросить', action: { type: 'popup', id: 'common-modal', formName: 'Предложение' } },
		{ title: 'Подробнее', action: { type: 'link', url: '/details/' } },
	]}
/>
```

`title` и `subtitle` — обычный текст. `content` — доверенный HTML из репозитория:
абзацы, списки и другая редакционная разметка. `headingTag` — h2 или h3.
`titleClass` меняет оформление заголовка. `buttons` выводит первые две кнопки;
пустой массив не резервирует область действий. `classes` у кнопки переопределяет
стандартный вариант; `download` сохраняет атрибут скачивания. Типы — в `types.ts`.

Медиа сохраняет `imgPlacement`, `images`, `imageAspectRatio`, `imageFit`,
оверлеи MediaFrame и `lightboxDescription`. Галерея подключается самой карточкой;
старые импорты `ui/card-media/slider` не вызывают повторную инициализацию.
Каждая карточка получает отдельную группу лайтбокса; `gallery` позволяет
намеренно объединить несколько экземпляров.

По умолчанию `mediaVariant="split"`: медиа занимает половину карточки на desktop.
`mediaVariant="thumbnail"` создаёт компактный эскиз. Его ширина ограничена
`thumbnailWidth` (по умолчанию `12rem`) и доступной шириной контейнера; `contain`
сохраняет изображение целиком. Размер задаёт вызывающий код, ограничение
исполняет CardMedia. Без медиа текст занимает всю ширину.

Слоты `card-image` и `card-content` сохраняют старые вызовы. В слотах размер
и разметку изображения по-прежнему определяет вызывающая страница.
`card-heading` заменяет стандартный заголовок; `card-content` заменяет `content`.
Кнопки можно передать вместе с любым содержимым через слот. Для HTML внутри
слота класс `card-media-content` применяет общие отступы и оформление списков.

## Данные страницы

RichContentBlock принимает такой же объект в `content.mediaCard`; позицию задаёт
`contentOrder`. Это работает и в `page.blocks` через существующий rich-content.

```json
{
  "type": "rich-content",
  "contentOrder": ["title", "mediaCard"],
  "content": {
    "title": "Раздел",
    "mediaCard": {
      "title": "Предложение",
      "content": "<p>Короткое описание.</p>",
      "images": [{"imageUrl": "/photo.webp", "alt": "Фотография"}],
      "buttons": [{"title": "Подробнее", "action": {"type": "link", "url": "/details/"}}]
    }
  }
}
```

## Предметные обёртки и совместимость

- `ModelCarsCards` сохраняет прежний публичный API. `prepare-model-cards.js`
  готовит цены, выгоды, фото, overrides и порядок без чтения JSON/окружения.
  Astro-адаптер фильтрует видимый склад и вызывает прежнее сопоставление модели,
  теперь относительно переданного набора `models`. Карточку рисует CardMedia,
  а цена и список — её предметное содержимое. `override.content` позволяет
  заменить только список выгод HTML-текстом, сохраняя цену и `contentItems`.
  Переход из лайтбокса к предложению вынесен в `model-lightbox-offer.js`.
- `ManualMediaCard` передаёт название руководства, эскиз и две кнопки. Параметр
  `thumbnailWidth` доступен и у этой обёртки.
- Существующие страницы GAC Armada, Geely Партнер Пенза, кузовного сервиса,
  страницы LIVAN, MDX Jetour/Belgee/TANK/GAC продолжают передавать слоты.
  HAVAL sale.ton-auto-haval.ru и haval-ulyanovsk.ru сохраняют свои кампании,
  overrides, цены и formName. Их страницы не переписаны этим изменением.

Проверка логики: `node --test src/blocks/cars/ModelCarsCards.test.mjs`.
Живые примеры: guide `card-media`, `manual-media`, `model-cars-cards`,
`rich-media-card` и `universal-section`.
