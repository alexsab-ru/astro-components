# ISalons

## Поле `type`

- Если `type` не указан → салон показывается везде (в т.ч. в футере).
- Если `type` указан и включает `'footer'` → показывается в футере.
- Если `type` указан и НЕ включает `'footer'` → в футере не показывается.

То есть `type` работает как “белый список” только когда он задан. Без него — показ везде.

Соберу точный список всех мест в проекте, где фильтруют по полю `type` из **salons.json**.

Вот все файлы, где есть проверка `!salon?.type || salon?.type.includes(...)` или близкая фильтрация по `type` для данных из `salons.json`:

- src/blocks/cars/CarsItem.astro
- src/blocks/contacts/Contacts.astro
- src/blocks/dealer-contact-cta/DealerContactCta.astro
- src/blocks/forms/feedback-form/FeedbackFormFields.astro
- src/blocks/forms/online-calculation/OnlineCalculation.astro
- src/pages/chat.astro
- src/pages/contacts.astro
- src/pages/cookie-policy.astro
- src/pages/import.astro
- src/pages/model-page/[...slug].astro
- src/pages/models/[...slug].astro
- src/pages/privacy-policy.astro
- src/pages/test-drive.astro
- src/pages/trade-in.astro
- src/site-shell/footer/FooterV2.astro
- src/site-shell/footer/FooterV3.astro
- src/site-shell/header/Header.astro
- src/site-shell/modals/Modals.astro
- src/templates/site-page/SitePage.astro
- src/types/readme.md

## Поле `hidden_in`

Если нужно скрыть адреса в каком-либо регионе/регионах, то указываем `"hidden_in": ["footer", "map"]` - адрес не будет указан в футере и на карте, даже если по какой-то причине был указан `"type"` с перечнем регионов, в который не входили вышеперечисленные регионы. То есть `"hidden_in"` приоритетнее.
