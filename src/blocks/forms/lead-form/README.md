# Общие части заявок

| Компонент | Ответственность |
| --- | --- |
| LeadForm | Нативный form, novalidate, form/comment и email-honeypot, слот содержимого |
| ContactFields | Input имени и телефона без дополнительного контейнера |
| ConsentFields | Обязательный agree и опциональный скрытый subscribe |

Эти части используются в CallbackFormFields, FeedbackFormFields, TradeInFormFields,
OnlineCalculationFormFields и LeadFormFields модального окна. Они не импортируют настройки
сайта, не подключают отправку и не задают внешнюю раскладку.

```astro
<LeadForm formName="Запись" class="flex flex-col gap-4">
  <ContactFields phoneField={{ errorText: 'Укажите телефон' }} />
  <ConsentFields label={agreeLabel} />
  <Button view="form-button" title="Отправить" />
</LeadForm>
```

LeadForm передаёт нативные атрибуты form: class, id, data-* и остальные.
Скрытый comment появляется только при явно переданном значении; пользовательская
Textarea остаётся частью сценария. honeypot сохраняет type=email, name=email,
tabindex=-1 и прежнее оформление. novalidate оставляет проверку прежнему JS.

ContactFields принимает nameField и phoneField с параметрами Input: классы,
placeholder, label/hint, errorText/errorClasses, required и autocomplete.
По умолчанию имя необязательно, телефон обязателен. Имена name/phone и тип tel
зафиксированы. Отсутствие обёртки сохраняет исходную сетку OnlineCalculation.

ConsentFields сохраняет прежний Checkbox. По умолчанию color=black,
subscribe=true; subscribe=false используется в Trade-in. Скрытая подписка
остаётся неотмеченной и не создаёт новый визуальный элемент.

## Какие формы сохраняются

| Сценарий | Особенности |
| --- | --- |
| CallbackFormFields | Форма с комментарием showComment: required и minlength=10; секция CallbackForm добавляет адаптивный фон и режим phone без form |
| FeedbackFormFields | Необязательная модель с brandSort и метаданными; центры test_drive и pageData |
| TradeInFormFields | Поля автомобиля, КПП и желаемая модель; js-trade-in-form, form=tradeInForm; без дилера и subscribe |
| OnlineCalculationFormFields | Кузовной расчёт, адрес salon, VIN и FileUpload; центры online_modal, отдельный sender файлов; секция OnlineCalculationForm добавляет фон и заголовки |
| LeadFormFields | Отдел обращения, дилер modalData, фиксированный ID и скрытый контекст модального окна |

У обёрток разные наборы данных и контракты, поэтому замена одной другой меняет
сценарий заявки. Дублирование общих полей убрано из самих обёрток. FeedbackForm
по-прежнему отвечает за заголовок и фотографии, TradeInForm — за внешний блок
оценки. Упрощённая заявка об обмене без характеристик автомобиля может использовать
FeedbackForm с подходящими заголовком и dataFormName, как и прежде.

## Имена и самостоятельное использование

| Секция с оформлением | Самостоятельная форма |
| --- | --- |
| CallbackForm | CallbackFormFields |
| FeedbackForm | FeedbackFormFields |
| TradeInForm | TradeInFormFields |
| OnlineCalculationForm | OnlineCalculationFormFields |
| LeadFormModal | LeadFormFields |

Импорты используют полное имя файла: `import TradeInFormFields from
'./TradeInFormFields.astro'`. CallbackFormFields и OnlineCalculationFormFields
можно вставлять отдельно от внешних заголовков и фоновых секций.

Прежние Callback.astro и OnlineCalculation.astro — переходные входы для
дилерских страниц на независимо обновляемых форках. Они только передают props
новым секциям и не содержат второй копии разметки. Для новых подключений
используются CallbackForm и OnlineCalculationForm. Старые входы можно убрать
после миграции потребителей и обновления соответствующих форков.

Общий фон OnlineCalculationForm: `https://img.upspace.ru/blocks/online-bg.webp`.
Его можно переопределить через bgUrl. Прежний адрес в blocks/kuzovsamara
сохранён для существующих сайтов; оба URL отдают одинаковый файл.

Проверка после сборки guide: `python3 scripts/verify-form-demos.py <dist>`
в astro-json. Она проверяет реальный HTML и состав отправляемых полей.
