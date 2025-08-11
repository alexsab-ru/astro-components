В массиве данных первый и последний слайд отличаются от остальных, поэтому в коде есть проверка на индекс перебираемого слайда. Т.е. предлагать варианты ответов можно в любых слайдах, кроме первого и последнего.

## Название формы
Название формы по умолчанию: **Квиз**. Но можно передавать через пропс: `<QuizSlider formName='Some form name' />`.

## Пример

```json
[
  {
    "title": "Подберите <b>АВТО</b> с&nbsp;максимальной выгодой от&nbsp;официального дилера в&nbsp;<b>ГОРОДЕ!</b>",
    "description": "<ul><li><span class=\"text-red-500 text-lg\">✓</span>&nbsp;Подарки при покупке</li><li><span class=\"text-red-500 text-lg\">✓</span>&nbsp;Авторассрочка 0.01%</li><li><span class=\"text-red-500 text-lg\">✓</span>&nbsp;Выгодный Trade-In</li><li><span class=\"text-red-500 text-lg\">✓</span>&nbsp;Авто в наличии</li><li><span class=\"text-red-500 text-lg\">✓</span>&nbsp;Официальный дилер</li><li><span class=\"text-red-500 text-lg\">✓</span>&nbsp;Пишем здесь все, что угодно</li></ul>",
    "backgroundImageUrl": "https://cdn.alexsab.ru/b/jetour/img/models/x90plus/sections/1.webp",
    "startButtonText": "Начать подбор авто"
  },
  {
    "id": "model",
    "type": "checkbox",
    "title": "Выберите модель:",
    "answerOptions": [
      "TIGGO 4 PRO",
      "TIGGO 7 PRO",
      "TIGGO 7 PRO MAX",
      "TIGGO 7 PRO MAX AWD",
      "Новый TIGGO 8",
      "TIGGO 8 PRO",
      "TIGGO 8 PRO MAX",
      "Новый TIGGO 8 PRO MAX",
      "ARRIZO 8"
    ],
    "backgroundImageUrl": "https://cdn.alexsab.ru/b/jetour/img/models/t2/sections/1.webp"
  },
  {
    "id": "transmission",
    "type": "radio",
    "title": "Выберите коробку передач:",
    "answerOptions": [
      "Механическая",
      "Автоматическая",
      "Любая"
    ],
    "backgroundImageUrl": "https://cdn.alexsab.ru/b/jetour/img/models/t2/sections/1.webp"
  },
  {
    "id": "color",
    "title": "Выберите цвет авто:",
    "type": "radio",
    "answerOptions": [
      "черный",
      "белый",
      "синий",
      "красный",
      "еще не определился"
    ],
    "backgroundImageUrl": "https://cdn.alexsab.ru/b/jetour/img/models/t2/sections/1.webp"
  },
  {
    "id": "tradein",
    "title": "Планируете ли сдавать свой авто в Трейд-ин (обмен старого авто на новый)",
    "type": "radio",
    "answerOptions": [
      "Да",
      "Нет",
      "Еще не определился"
    ],
    "backgroundImageUrl": "https://cdn.alexsab.ru/b/jetour/img/models/t2/sections/1.webp"
  },
  {
    "id": "purchaseMethod",
    "title": "Выберите способ покупки:",
    "type": "radio",
    "answerOptions": [
      "Внесу сразу всю сумму",
      "Кредит",
      "Лизинг",
      "Рассмотрю все варианты"
    ],
    "backgroundImageUrl": "https://cdn.alexsab.ru/b/jetour/img/models/t2/sections/1.webp"
  },
  {
    "title": "По заданным параметрам найдено 3 автомобиля. <br>Оставьте номер вашего телефона, чтобы получить подробную консультацию",
    "description": "<ul><li><span class=\"text-red-500 text-lg\">✓</span>&nbsp;Честная авторассрочка</li><li><span class=\"text-red-500 text-lg\">✓</span>&nbsp;Переплата 0%</li></ul>",
    "backgroundImageUrl": "https://cdn.alexsab.ru/b/jetour/img/models/t2/sections/1.webp"
  }
]

```

Если в шаге "Выбор модели" оставить массив с моделями пустым, то модели будут подставляться из файла `models.json`.
