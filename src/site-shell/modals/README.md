# Стандартные окна сайта

`Modals.astro` — композиция четырёх компонентов и слота дополнительных окон:

| Компонент | Сохранённый контракт |
| --- | --- |
| LeadFormModal | common-modal, common-modal-form, .title/.subtitle, form/comment/departament/dealer/agree |
| MessageModal | message-modal, #icon и первый p для SDK showMessageModal |
| RepeatRequestModal | confirm-modal, accept-confirm, accept-close и первый p |
| FileDeleteModal | dropzone-confirm-modal, dropzone-accept, dropzone-cancel, .message |

Композицию размещают один раз на странице: фиксированные ID служебных окон
нужны SDK и Dropzone. `showLeadForm=false` убирает только окно заявки.
Параметр `leadForm` позволяет передать настройки LeadFormModal, не меняя его
обязательный common-modal ID. Новое произвольное окно добавляется через
общую оболочку Modal и слот композиции/страницы, без правки этого списка.

LeadFormFields содержит прежние поля и honeypot. Label согласия, отделы и салоны
передаются явно; LeadFormModal по умолчанию читает их из настроек сайта.
Единственный отдел отправляется скрытым departament; несколько отделов
управляются прежним data-choose_department. По умолчанию выбор дилера связан
с общим salonsStore; `useDealerStore=false` использует переданный список.

`modal-form-context.js` обрабатывает метаданные триггера, form/comment,
отдел и выбор дилера через select-dealer после Alpine.nextTick. При повторном
открытии отсутствующие метаданные восстанавливают начальные значения окна.
Опциональные .modal-grid-content/.left/.right — контейнеры динамических
изображений; без них data-img не приводит к ошибке. Картинка имеет отдельный
класс modal-context-image, чтобы не наследовать фоновый absolute-стиль
отложенного окна AutoShowModal. Отправка, cookie-проверка
повторной заявки и результат SDK остаются в прежних обработчиках.

Старый `js/modules/modals.js` сохраняет точку подключения приложения:
связывает адаптер с reachGoal и общим контроллером. Пользовательское закрытие
по-прежнему сбрасывает форму и вызывает form_close; ошибки очищаются только
в закрываемом окне. Прямые classList-изменения SDK синхронизируют видимость,
фокус и прокрутку, не подменяя отправку.

Dropzone использует confirmFileRemoval. Подтверждение выполняет accepted один
раз; Cancel, крестик, фон и Escape выполняют rejected и освобождают listeners.
Новый вопрос отменяет предыдущий незавершённый callback. Это исключает
удаление старого файла после закрытия предыдущего окна.
