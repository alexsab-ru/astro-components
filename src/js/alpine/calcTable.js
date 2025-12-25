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
      this.selectedItems.forEach(item => {
        const row = document.querySelector(`tr[data-title="${item.title}"]`);
        if (row) {
          row.classList.add('selected');
        }
      });
    }
  });
}
