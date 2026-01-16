import Alpine from 'alpinejs';

const STORAGE_KEY = 'calcItems_data';

export function calcTable() {
  // Глобальное хранилище для всех таблиц
  Alpine.store('calcItems', {
    total: 0,
    selectedItems: [],

    /**
     * Делаем стабильный ключ для строки таблицы.
     *
     * Зачем:
     * - Раньше мы определяли выбранность только по `title` или (title + price).
     * - Но одинаковые услуги могут встречаться в РАЗНЫХ категориях
     *   (например "Замена масла" 5000 ₽ в "Диагностика" и "ТО").
     * - Если ключ не учитывает категорию, клики начинают конфликтовать:
     *   - клик по второй строке удаляет первую,
     *   - визуальная подсветка и состояние расходятся.
     *
     * Поэтому считаем элемент уникальным по тройке:
     * (group + title + price).
     * Это простой, но корректный ключ для всех таблиц.
     */
    makeKey(group, title, price) {
      // JSON.stringify даёт однозначную строку и не требует ручного экранирования.
      return JSON.stringify([
        String(group ?? ''),
        String(title ?? ''),
        Number(price ?? 0),
      ]);
    },

    // Инициализация - загружаем данные из localStorage
    init() {
      this.load();
      // Восстанавливаем визуальное состояние после загрузки DOM
      document.addEventListener('DOMContentLoaded', () => this.restoreUI());
      // На случай если DOM уже загружен
      if (document.readyState !== 'loading') {
        this.restoreUI();
      }
    },
    
    /**
     * Безопасный обработчик клика по строке таблицы.
     *
     * Почему так:
     * - Раньше в разметке было `@click="toggleItem(price, 'TITLE', $el)"`.
     * - Если TITLE содержит одинарную кавычку (например "Oil's Change"),
     *   JS-выражение Alpine ломается (строка преждевременно закрывается).
     *
     * Поэтому вместо интерполяции строки в JS читаем данные из `data-*` атрибутов строки.
     */
    toggleRow(row) {
      if (!row) return;

      const title = row.dataset?.title ?? '';
      const price = Number(row.dataset?.price ?? 0);
      // Группа (категория) нужна, чтобы различать одинаковые услуги в разных блоках.
      const group = row.dataset?.group ?? '';

      // Если данных нет — ничего не делаем (защита от неправильной разметки).
      if (!title || !Number.isFinite(price)) return;

      this.toggleItem(price, title, row, group);
    },

    toggleItem(price, title, row, group = '') {
      /**
       * ВАЖНО:
       * Ищем по (group + title + price), а не только по title/price.
       * Иначе одинаковые услуги в разных категориях конфликтуют.
       */
      const index = this.selectedItems.findIndex(
        (item) =>
          item.title === title &&
          item.price === price &&
          (item.group ?? '') === (group ?? '')
      );
      
      if (index === -1) {
        // Добавляем
        this.total += price;
        this.selectedItems.push({ group: String(group ?? ''), title, price });
        row.classList.add('selected');
      } else {
        // Убираем
        /**
         * ВАЖНО:
         * Вычитаем цену из сохранённого элемента, а не "переданный price".
         * Даже если разметка/параметры по какой-то причине отличаются,
         * `total` должен соответствовать тому, что реально лежит в selectedItems.
         */
        const storedPrice = Number(this.selectedItems[index]?.price ?? 0);
        this.total -= Number.isFinite(storedPrice) ? storedPrice : 0;
        this.selectedItems.splice(index, 1);
        row.classList.remove('selected');
      }

      this.save();
    },
    
    clear() {
      this.total = 0;
      this.selectedItems = [];
      document.querySelectorAll('tr.selected').forEach(row => row.classList.remove('selected'));
      this.save();
    },

    // Сохранение в localStorage
    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          total: this.total,
          selectedItems: this.selectedItems
        }));
      } catch (e) {
        console.warn('Не удалось сохранить в localStorage:', e);
      }
    },

    // Загрузка из localStorage
    load() {
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          /**
           * ВАЖНО (защита от “порчи” localStorage):
           * Раньше было: `this.total = parsed.total || 0`.
           *
           * Проблема:
           * - Если `total` по ошибке попал строкой (например "100"), то `this.total` станет строкой.
           * - Тогда дальнейшая арифметика сломается:
           *   this.total += 50  // => "100" + 50 = "10050" (конкатенация), а не 150.
           *
           * Решение:
           * - Приводим к числу через Number(...)
           * - И явно проверяем Number.isFinite, чтобы NaN/Infinity не попадали в состояние.
           */
          const loadedTotal = Number(parsed?.total);
          this.total = Number.isFinite(loadedTotal) ? loadedTotal : 0;

          /**
           * Аналогично “санитаризируем” selectedItems:
           * - localStorage мог быть изменён вручную, расширением, старой версией кода и т.п.
           * - Нам важно, чтобы price всегда был числом, иначе:
           *   - подсчёт total может ломаться
           *   - restoreUI может работать непредсказуемо
           */
          const loadedItems = Array.isArray(parsed?.selectedItems) ? parsed.selectedItems : [];
          this.selectedItems = loadedItems
            .map((item) => {
              // group мог отсутствовать в старой версии localStorage — нормализуем в строку.
              const group = String(item?.group ?? '');
              const title = String(item?.title ?? '');
              const price = Number(item?.price ?? 0);
              if (!title || !Number.isFinite(price)) return null;
              return { group, title, price };
            })
            .filter(Boolean);
        }
      } catch (e) {
        console.warn('Не удалось загрузить из localStorage:', e);
      }
    },

    // Восстановление визуального состояния (подсветка выбранных строк)
    restoreUI() {
      /**
       * ВАЖНО (безопасность селектора):
       * Раньше было: `querySelector(\`tr[data-title="${item.title}"]\`)`.
       * Это ломается, если в title есть:
       * - двойные кавычки
       * - обратный слэш
       * - спецсимволы CSS-селектора
       *
       * Вместо сборки CSS-селектора используем dataset и сравнение строк.
       * Так вообще не нужно экранирование (CSS.escape и т.п.).
       *
       * ВАЖНО (фикс бага с “устаревшими” услугами):
       * - `load()` восстанавливает selectedItems/total из localStorage.
       * - Но данные услуг на странице могут измениться между визитами:
       *   - услугу удалили
       *   - поменяли цену
       *   - поменяли название
       * - Старый код тут только подсвечивал совпавшие строки,
       *   но НЕ удалял устаревшие элементы из selectedItems и НЕ пересчитывал total.
       *
       * Симптомы:
       * - В CalcBar отображается неправильная сумма и количество услуг.
       * - В заявке (data-comment) улетают услуги, которых уже нет на странице.
       *
       * Решение:
       * - Собираем все текущие строки в Map по ключу (group+title+price).
       * - Фильтруем selectedItems: оставляем только те, что реально есть в DOM.
       * - Пересчитываем total как сумму price от отфильтрованных элементов.
       * - Сохраняем обновлённое состояние обратно в localStorage.
       */
      const rows = document.querySelectorAll('tr[data-title][data-price]');
      const rowsByKey = new Map();

      rows.forEach((row) => {
        const title = row.dataset?.title;
        const price = Number(row.dataset?.price ?? 0);
        const group = row.dataset?.group ?? '';
        if (!title || !Number.isFinite(price)) return;
        rowsByKey.set(this.makeKey(group, title, price), row);
      });

      // На всякий случай сначала сбрасываем подсветку на всех текущих строках,
      // чтобы избежать "залипания" класса при динамических перерендерах таблиц.
      rows.forEach((row) => row.classList.remove('selected'));

      // Оставляем в состоянии только те элементы, которые реально существуют на странице сейчас.
      const prevLength = this.selectedItems.length;
      const prevTotal = this.total;

      const filteredItems = [];
      let recalculatedTotal = 0;

      this.selectedItems.forEach((item) => {
        // group может отсутствовать в старых данных localStorage — считаем это ''.
        const key = this.makeKey(item.group ?? '', item.title, item.price);
        const row = rowsByKey.get(key);

        // Если строки нет — элемент считается устаревшим и выкидывается.
        if (!row) return;

        filteredItems.push(item);
        recalculatedTotal += Number(item.price) || 0;
        row.classList.add('selected');
      });

      // Обновляем состояние только если что-то действительно изменилось —
      // так меньше лишних записей в localStorage.
      this.selectedItems = filteredItems;
      this.total = Number.isFinite(recalculatedTotal) ? recalculatedTotal : 0;

      if (this.selectedItems.length !== prevLength || this.total !== prevTotal) {
        this.save();
      }
    }
  });
}
