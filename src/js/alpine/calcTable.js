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
     * - Раньше мы определяли выбранность только по `title`.
     * - Если существуют 2 услуги с одинаковым названием, но с разной ценой,
     *   то клик по второй "находил" первую (findIndex по title) и удалял НЕ ТО.
     * - Плюс при удалении вычиталась переданная цена, а не сохранённая,
     *   из-за чего `total` рассинхронизировался (вплоть до отрицательных значений).
     *
     * Поэтому считаем элемент уникальным по паре (title + price).
     * Это минимальный и понятный фикс под описанный кейс.
     */
    makeKey(title, price) {
      // JSON.stringify даёт однозначную строку и не требует ручного экранирования.
      return JSON.stringify([String(title ?? ''), Number(price ?? 0)]);
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

      // Если данных нет — ничего не делаем (защита от неправильной разметки).
      if (!title || !Number.isFinite(price)) return;

      this.toggleItem(price, title, row);
    },

    toggleItem(price, title, row) {
      /**
       * ВАЖНО:
       * Ищем по (title + price), а не только по title.
       * Иначе две одинаковые услуги с разной ценой конфликтуют.
       */
      const index = this.selectedItems.findIndex(
        (item) => item.title === title && item.price === price
      );
      
      if (index === -1) {
        // Добавляем
        this.total += price;
        this.selectedItems.push({ title, price });
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
              const title = String(item?.title ?? '');
              const price = Number(item?.price ?? 0);
              if (!title || !Number.isFinite(price)) return null;
              return { title, price };
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
       */
      const rows = document.querySelectorAll('tr[data-title][data-price]');
      const rowsByKey = new Map();

      rows.forEach((row) => {
        const title = row.dataset?.title;
        const price = Number(row.dataset?.price ?? 0);
        if (!title || !Number.isFinite(price)) return;
        rowsByKey.set(this.makeKey(title, price), row);
      });

      this.selectedItems.forEach((item) => {
        const row = rowsByKey.get(this.makeKey(item.title, item.price));
        if (row) row.classList.add('selected');
      });
    }
  });
}
