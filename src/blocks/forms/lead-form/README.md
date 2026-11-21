# Общие части заявок

| Компонент | Ответственность |
| --- | --- |
| LeadForm | Нативный form, novalidate, form/comment и email-honeypot, слот содержимого |
| ContactFields | Input имени и телефона без дополнительного контейнера |
| ConsentFields | Обязательный agree и опциональный скрытый subscribe |

Эти части используются в Callback, FeedbackFormFields, TradeInFormFields,
OnlineCalculation и LeadFormFields модального окна. Они не импортируют настройки
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
| Callback | Фоновая секция, адаптивный фон, режим phone без form; showComment с required и minlength=10 |
| FeedbackFormFields | Необязательная модель с brandSort и метаданными; центры test_drive и pageData |
| TradeInFormFields | Поля автомобиля, КПП и желаемая модель; js-trade-in-form, form=tradeInForm; без дилера и subscribe |
| OnlineCalculation | Кузовной расчёт, адрес salon, VIN и FileUpload; центры online_modal, отдельный sender файлов |
| LeadFormFields | Отдел обращения, дилер modalData, фиксированный ID и скрытый контекст модального окна |

У обёрток разные наборы данных и контракты, поэтому замена одной другой меняет
сценарий заявки. Дублирование общих полей убрано из самих обёрток. FeedbackForm
по-прежнему отвечает за заголовок и фотографии, TradeInForm — за внешний блок
оценки. Упрощённая заявка об обмене без характеристик автомобиля может использовать
FeedbackForm с подходящими заголовком и dataFormName, как и прежде.

Проверка после сборки guide: `python3 scripts/verify-form-demos.py <dist>`
в astro-json. Она проверяет реальный HTML и состав отправляемых полей.
