import Alpine from 'alpinejs';

const STORAGE_KEY = 'calcItems_data';

export function calcTable() {
  // Глобальное хранилище для всех таблиц
  Alpine.store('calcItems', {
    total: 0,
    selectedItems: [],

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
      const index = this.selectedItems.findIndex(item => item.title === title);
      
      if (index === -1) {
        // Добавляем
        this.total += price;
        this.selectedItems.push({ title, price });
        row.classList.add('selected');
      } else {
        // Убираем
        this.total -= price;
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
          this.total = parsed.total || 0;
          this.selectedItems = parsed.selectedItems || [];
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
      const rows = document.querySelectorAll('tr[data-title]');
      const rowsByTitle = new Map();

      rows.forEach((row) => {
        const title = row.dataset?.title;
        if (title) rowsByTitle.set(title, row);
      });

      this.selectedItems.forEach((item) => {
        const row = rowsByTitle.get(item.title);
        if (row) row.classList.add('selected');
      });
    }
  });
}
