## Подключение

```mdx
import QuizSlider from '@/components/QuizSlider/QuizSlider.astro';
<QuizSlider />
```

## Название формы

Название формы по умолчанию: **Квиз**. Но можно передавать через пропс: `<QuizSlider formName='Some form name' />`.

## Поля данных

В массиве данных первый и последний слайд отличаются от остальных, поэтому в коде есть проверка на индекс перебираемого слайда. Т.е. предлагать варианты ответов можно в любых слайдах, кроме первого и последнего.

### backgroundPosition

Поле `backgroundPosition` позволяет настроить позицию фонового изображения. Поддерживает следующие значения:
- Ключевые слова: `left`, `right`, `center`, `top`, `bottom`
- Процентные значения: `10%`, `20%`, `50%` и т.д.
- Комбинированные значения: `center top`, `left bottom` и т.д.

Если поле не указано, используется значение по умолчанию `center`.

## Пример

```json
[
  {
    "title": "Подберите <b>АВТО</b> с&nbsp;максимальной выгодой от&nbsp;официального дилера в&nbsp;<b>ГОРОДЕ!</b>",
    "description": "<ul><li><span class=\"text-red-500 text-lg\">✓</span>&nbsp;Подарки при покупке</li><li><span class=\"text-red-500 text-lg\">✓</span>&nbsp;Авторассрочка 0.01%</li><li><span class=\"text-red-500 text-lg\">✓</span>&nbsp;Выгодный Trade-In</li><li><span class=\"text-red-500 text-lg\">✓</span>&nbsp;Авто в наличии</li><li><span class=\"text-red-500 text-lg\">✓</span>&nbsp;Официальный дилер</li><li><span class=\"text-red-500 text-lg\">✓</span>&nbsp;Пишем здесь все, что угодно</li></ul>",
    "backgroundImageUrl": "https://cdn.alexsab.ru/b/jetour/img/models/x90plus/sections/1.webp",
    "backgroundPosition": "center",
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
    "backgroundImageUrl": "https://cdn.alexsab.ru/b/jetour/img/models/t2/sections/1.webp",
    "backgroundPosition": "left center"
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
    "backgroundImageUrl": "https://cdn.alexsab.ru/b/jetour/img/models/t2/sections/1.webp",
    "backgroundPosition": "right"
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
    "backgroundImageUrl": "https://cdn.alexsab.ru/b/jetour/img/models/t2/sections/1.webp",
    "backgroundPosition": "20% 50%"
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
    "backgroundImageUrl": "https://cdn.alexsab.ru/b/jetour/img/models/t2/sections/1.webp",
    "backgroundPosition": "center"
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
    "backgroundImageUrl": "https://cdn.alexsab.ru/b/jetour/img/models/t2/sections/1.webp",
    "backgroundPosition": "center"
  },
  {
    "title": "Спасибо! Оставьте номер вашего телефона, чтобы получить подробную консультацию по выбранному автомобилю.",
    "description": "<ul><li><span class=\"text-red-500 text-lg\">✓</span>&nbsp;Честная авторассрочка</li><li><span class=\"text-red-500 text-lg\">✓</span>&nbsp;Переплата 0%</li></ul>",
    "backgroundImageUrl": "https://cdn.alexsab.ru/b/jetour/img/models/t2/sections/1.webp",
    "backgroundPosition": "center"
  }
]
```

Если в шаге **"Выберите модель:"** оставить массив с моделями пустым, то модели будут подставляться из файла `models.json`.
