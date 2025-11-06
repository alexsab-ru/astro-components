// formSelect.js
// Логика компонента FormSelect с поддержкой сортировки и фильтрации
import Alpine from 'alpinejs';

export function formSelect() {
	Alpine.data('formSelect', (options, models, placeholder, disabled) => ({
		open: false, 
		// Исходные опции (не изменяются)
		originalOptions: options || [],
		// Текущие опции для отображения (реактивные, обновляются автоматически)
		options: options || [],
		models: models || [],
		placeholder: placeholder || 'Выберите значение',
		disabled: disabled || false,
		originalDisabled: disabled || false, // Сохраняем исходное состояние disabled
		value: null,
		pathname: window.location.pathname,
		currentOption: {},
		// Параметры для сортировки и фильтрации
		searchQuery: '',
		sortType: 'none', // 'none', 'asc', 'desc'
		filterValue: null, // для фильтрации по значению
		priorityOptions: [], // массив ID опций, которые должны быть в начале списка
		
		// Получить обработанные опции с учетом фильтрации и сортировки
		getProcessedOptions() {
			let processed = [...this.originalOptions];
			
			// Применяем фильтрацию по поисковому запросу
			if (this.searchQuery && this.searchQuery.trim() !== '') {
				const query = this.searchQuery.toLowerCase().trim();
				processed = processed.filter(option => 
					option.name.toLowerCase().includes(query)
				);
			}
			
			// Применяем фильтрацию по значению (если указано)
			if (this.filterValue !== null && this.filterValue !== undefined && this.filterValue !== '') {
				// Если filterValue - массив, проверяем вхождение
				if (Array.isArray(this.filterValue)) {
					processed = processed.filter(option => {
						// Проверяем точное совпадение по ID
						const matchesId = this.filterValue.some(filterVal => 
							option.id == filterVal || String(option.id) === String(filterVal)
						);
						// Проверяем вхождение подстроки по name (без учета регистра)
						const matchesName = this.filterValue.some(filterVal => {
							const filterStr = String(filterVal).toLowerCase().trim();
							const optionName = String(option.name).toLowerCase();
							return optionName.includes(filterStr);
						});
						return matchesId || matchesName;
					});
				} else {
					// Для строки: точное совпадение по ID или вхождение подстроки по name
					const filterStr = String(this.filterValue).toLowerCase().trim();
					processed = processed.filter(option => {
						// Точное совпадение по ID
						const matchesId = option.id == this.filterValue || String(option.id) === String(this.filterValue);
						// Вхождение подстроки по name (без учета регистра)
						const optionName = String(option.name).toLowerCase();
						const matchesName = optionName.includes(filterStr);
						return matchesId || matchesName;
					});
				}
			}
			
			// Применяем сортировку по приоритетным опциям (если указаны)
			// Приоритетные опции всегда в начале списка
			if (this.priorityOptions && this.priorityOptions.length > 0) {
				const priorityIds = Array.isArray(this.priorityOptions) 
					? this.priorityOptions 
					: (typeof this.priorityOptions === 'string' 
						? this.priorityOptions.split(',').map(id => id.trim())
						: []);
				
				// Разделяем опции на приоритетные и остальные
				const priorityList = [];
				const otherList = [];
				
				processed.forEach(option => {
					const isPriority = priorityIds.some(priorityId => 
						option.id == priorityId || option.name === priorityId || String(option.id) === String(priorityId)
					);
					if (isPriority) {
						priorityList.push(option);
					} else {
						otherList.push(option);
					}
				});
				
				// Сортируем приоритетные опции в порядке указанных ID
				priorityList.sort((a, b) => {
					const indexA = priorityIds.findIndex(id => 
						a.id == id || a.name === id || String(a.id) === String(id)
					);
					const indexB = priorityIds.findIndex(id => 
						b.id == id || b.name === id || String(b.id) === String(id)
					);
					return indexA - indexB;
				});
				
				// Сортируем остальные опции по алфавиту (если нужно)
				if (this.sortType === 'asc') {
					otherList.sort((a, b) => {
						const nameA = a.name.toLowerCase();
						const nameB = b.name.toLowerCase();
						return nameA.localeCompare(nameB, 'ru');
					});
				} else if (this.sortType === 'desc') {
					otherList.sort((a, b) => {
						const nameA = a.name.toLowerCase();
						const nameB = b.name.toLowerCase();
						return nameB.localeCompare(nameA, 'ru');
					});
				}
				
				// Объединяем: сначала приоритетные, потом остальные
				processed = [...priorityList, ...otherList];
			} else {
				// Если приоритетных опций нет, применяем обычную сортировку
				if (this.sortType === 'asc') {
					processed.sort((a, b) => {
						const nameA = a.name.toLowerCase();
						const nameB = b.name.toLowerCase();
						return nameA.localeCompare(nameB, 'ru');
					});
				} else if (this.sortType === 'desc') {
					processed.sort((a, b) => {
						const nameA = a.name.toLowerCase();
						const nameB = b.name.toLowerCase();
						return nameB.localeCompare(nameA, 'ru');
					});
				}
			}
			
			return processed;
		},
		
		// Обновить опции на основе текущих фильтров и сортировки
		updateOptions() {
			this.options = this.getProcessedOptions();
			
			// Проверяем, осталась ли текущая выбранная опция в новом списке
			if (this.currentOption && this.currentOption.id) {
				const isCurrentOptionInList = this.options.some(option => option.id === this.currentOption.id);
				if (!isCurrentOptionInList) {
					// Если выбранная опция больше не в списке, сбрасываем выбор
					this.currentOption = {};
					this.value = null;
				} else {
					// Если опция в списке, обновляем значение из актуальной опции
					const updatedOption = this.options.find(option => option.id === this.currentOption.id);
					if (updatedOption) {
						this.value = updatedOption.name || null;
					}
				}
			}
			
			// Если после фильтрации осталась только одна опция, выбираем её автоматически
			if (this.options.length === 1) {
				const singleOption = this.options[0];
				// Выбираем опцию только если она еще не выбрана
				if (!this.currentOption || !this.currentOption.id || this.currentOption.id !== singleOption.id) {
					// Ищем опцию в исходных опциях для корректного выбора
					const originalOption = this.originalOptions.find(o => o.id === singleOption.id);
					if (originalOption) {
						this.select(singleOption.id);
					} else {
						// Если опция не найдена в исходных, устанавливаем напрямую
						this.currentOption = singleOption;
						this.value = singleOption.name || null;
					}
				} else {
					// Если опция уже выбрана, обновляем значение на всякий случай
					this.value = singleOption.name || null;
				}
				// Делаем селект disabled, если он не был disabled изначально
				if (!this.originalDisabled) {
					this.disabled = true;
				}
			} else if (this.options.length !== 1) {
				// Если опций больше одной, восстанавливаем исходное состояние disabled
				// (только если оно было изменено автоматически)
				if (this.disabled && !this.originalDisabled) {
					this.disabled = false;
				}
			}
		},
		
		// Метод для установки сортировки
		setSortType(type) {
			this.sortType = type; // 'none', 'asc', 'desc'
			this.updateOptions();
		},
		
		// Метод для установки поискового запроса
		setSearchQuery(query) {
			this.searchQuery = query || '';
			this.updateOptions();
		},
		
		// Метод для установки фильтра
		setFilter(value) {
			this.filterValue = value;
			this.updateOptions();
		},
		
		// Метод для установки приоритетных опций
		setPriorityOptions(priorities) {
			// Поддерживаем разные форматы: строку с запятыми, массив, или null для сброса
			if (!priorities || priorities === '') {
				this.priorityOptions = [];
			} else if (typeof priorities === 'string') {
				// Если строка, разделяем по запятым
				this.priorityOptions = priorities.split(',').map(id => id.trim()).filter(id => id);
			} else if (Array.isArray(priorities)) {
				this.priorityOptions = priorities;
			} else {
				this.priorityOptions = [priorities];
			}
			this.updateOptions();
		},
		
		// Метод для сброса всех фильтров и сортировки
		resetFilters() {
			this.searchQuery = '';
			this.sortType = 'none';
			this.filterValue = null;
			this.priorityOptions = [];
			// Сбрасываем выбранное значение и опцию
			this.value = null;
			this.currentOption = {};
			this.updateOptions();
		},
		
		openSelect() {
			if (!this.disabled) {
				this.open = !this.open;
			}
		},
		
		select(id){
			if(!id) return;
			// Ищем в исходных опциях, а не в обработанных
			this.currentOption = this.originalOptions.find(o => o.id === id);
			if (this.currentOption) {
				this.value = this.currentOption.name || null;
				this.open = false;
				this.$refs.error ? this.$refs.error.classList.add('hidden') : null;
			}
		},
		
		// Инициализация при загрузке страницы с моделями
		initModelSelection() {
			if(this.pathname.includes('models')){
				const split = this.pathname.slice(1, -1).split('/');
				const modelID = split.length > 1 ? split[split.length-1] : null;
				const model = modelID ? this.models.find(m => m.id === modelID) : null;
				const currentOption = model ? this.originalOptions.find(o => o.name.toLowerCase().includes(model?.mark_id.toLowerCase())) : null;
				if(currentOption){
					this.select(currentOption.id);
				}
			}
			// Проверяем, если изначально только одна опция, выбираем её автоматически
			this.updateOptions();
		},
	}));
}

