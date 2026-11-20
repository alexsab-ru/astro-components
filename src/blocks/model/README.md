# Самостоятельные блоки и композиция модели

Общие блоки не импортируют модели, склад, цены или настройки сайта:

| Компонент | Данные | Размещение |
| --- | --- | --- |
| Hero | image, breadcrumb, eyebrow, title, subtitle (HTML), points, badge | Первый экран любой страницы |
| Characteristics | items: title/value/measure | Любое место страницы |
| ColorShowcase | items: id/name/image/style, alt | Изображение вместе с собственной палитрой |
| ImageCarousel | images: url/alt/title/description, fullBleed | Семейство image-gallery; по умолчанию до краёв экрана |
| ActionGroup | items или preset=callback/request | Произвольные кнопки через CardAction |

Hero имеет фиксированный порядок: крошки → необязательный текст перед
заголовком → заголовок → подзаголовок → пункты. Цена может быть содержимым
HTML-подзаголовка. Пустые поля не резервируют пространство. Бейдж находится
в углу внутри Hero; фон поддерживает desktop/tablet/mobile. classes и
contentClass задают размеры и отступы, цвета кнопок наследуются от бренда.

ColorShowcase не ищет родительский section: управляет только своим изображением,
подписью и aria-pressed. Повторные экземпляры независимы; устаревшая загрузка
картинки не перезаписывает более новый выбор. Оформление палитры общее с ColorLink.

ImageCarousel использует GalleryImage и локальный Swiper. Группы лайтбокса
по умолчанию разные; одинаковый gallery намеренно объединяет их. GLightbox
остаётся общим. fullBleed=false ограничивает фотоленту контейнером.

## Model — адаптер существующих данных

Model собирает общие блоки через ModelHero, ModelColors, ModelPhotos,
ModelCharacteristics и ModelActions. Прежние вызовы model/breadcrumb/status
сохранены. Порядок внешних частей: hero, colors, media, characteristics, actions.
colors — изображение вместе с палитрой; media — фотолента. parts.key=false
отключает блок, partOrder меняет порядок (неуказанные идут в конце).
Порядок внутри Hero не настраивается; heroOrder больше не используется.
Для второго экземпляра модели можно передать отдельный id секции.

ModelHero использует общий Hero, сохраняя название бренда, цену/запрос цены,
статус предзаказа и метаданные popup. ModelPrice/Heading/Slogan/Benefits/Badge
содержат предметное оформление и перевод данных. Хлебные крошки передаются
копией, чтобы повторные экраны не меняли исходный массив.

ModelPhotos загружает прежний model.photos только когда блок media видим,
либо принимает готовый photos. Ошибки загрузки не скрываются.

## Наборы действий модели

- default: buy, credit, testDrive, offer, configuration.
- purchase: buy, offer, configuration.
- contact: offer.

Явный actions задаёт точный список и порядок; можно смешивать идентификаторы
своих стандартных кнопок и объекты ActionButton. excludeActions исключает
идентификаторы. creditEnabled и testDriveEnabled отдельно отключают эти
действия. Глобальный флаг кредита и условие status=enable/show || model.show
сохранены; наличие комплектаций по-прежнему выбирает scroll-link или popup.

```astro
<ModelActions model={model} status="enable" excludeActions={['testDrive','credit']} />
<ModelActions model={model} status="enable" preset="purchase" />
<ModelActions model={model} status="enable" actions={[
  'offer', {title:'Свой раздел', action:{type:'link',url:'/details/'}}
]} />
```

## Генерация страниц

BlockRenderer понимает независимые типы hero, characteristics, color-showcase,
image-carousel, action-group. Их content/props содержит обычные данные —
context.model не требуется. Для модели есть контекстные адаптеры model-hero,
model-colors, model-media, model-characteristics, model-actions: они позволяют
ставить разделы в любом месте page.blocks, не копируя поля модели в JSON.

Настройки готового первого экрана задаются через model.page.hero:

```json
{"page":{"hero":{
  "parts":{"characteristics":false,"media":false},
  "excludeActions":["testDrive","credit"],
  "eyebrow":"Дополнительная подпись"
},"blocks":{"specs":{"type":"model-characteristics"}}}}
```

В этом примере характеристики можно разместить позже среди остальных блоков
страницы. Общая композиция остальных маршрутов и данные дилеров не переписаны.

Последняя форма «Записаться на тест-драйв» выбирает фотографию независимо от
порядка page.blocks: сначала page.feedbackForm.imageUrl, затем изображение
Hero (media.homeImg / homeImg), первое доступное фото из colors и изображение
модели / thumb. Пустой imageUrl явно скрывает фотографию формы.

```json
{"page":{"feedbackForm":{"imageUrl":"https://img.upspace.ru/model-photo.webp"}}}
```
