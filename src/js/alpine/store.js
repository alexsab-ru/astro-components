// store.js
import Alpine from 'alpinejs';

import salons from '@/data/salons.json';

export function store() {
	Alpine.store('import', {
		currentModel: null,
		step: 0,
		model: null,
		models: [
			'K5',
			'Sportage',
			'Sorento'
		],
		brand: null,
		complectation: null,
		complectations: [
			'Comfort',
			'Luxe',
			'Prestige',
			'Style',
			'Premium'
		],
		color: null,
		colors: [
			'Черный',
			'Белый',
			'Серебряный',
			'Серый',
			'Красный',
			'Зеленый',
			'Синий',
			'Голубой',
			'Коричневый'
		],
		drive: null,
		drives: [
			'Полный',
			'Передний'
		],
		termOfPurchase: 'Кредит',
		termsOfPurchase: ['Кредит', 'Лизинг', 'Рассрочка', 'Полная оплата'],
		initialPayment: '0%',
		initialPayments: ['0%', '10%', '20%', '30%'],
		planningPurchase: 'Готов сейчас',
		planningPurchases: ['В ближайшие время', 'Готов сейчас', 'Планирую на будущее'],

		// Методы
		scrollToElement(element) {
			if (element) {
				setTimeout(() => {
					Alpine.nextTick(() => {
						window.scrollTo({
							top: element.offsetTop - 40,
							left: 0,
							behavior: 'smooth',
						});
					});
				}, 100);
			}
		},

		modelSelected(id) {
			Alpine.nextTick(() => {
				this.scrollToElement(document.querySelector('[x-ref="complectationBlock"]'));
			});
		},
	});

	Alpine.store('salonsStore', {
		data: salons.map((salon, idx) => ({id: idx, ...salon})),
		filteredData: salons.map((salon, idx) => ({id: idx, ...salon})),
		pageFilteredData: salons.map((salon, idx) => ({id: idx, ...salon})),
		shouldResetModalSelect: false,
		// Вспомогательная функция для проверки соответствия бренду
		matchesBrand(option, brandString) {
			if (!brandString) return false;
			const brands = brandString.split(',').map(b => b.trim().toLowerCase());
			const optionBrands = option?.brands ? option.brands.toLowerCase() : '';
			const optionName = option?.name ? option.name.toLowerCase() : '';
			
			return brands.some(brand => 
				optionBrands.includes(brand) || optionName.includes(brand)
			);
		},
		filterData(brand = null) {
			if(!brand){
				this.filteredData = this.data;
				return this.data;
			}  
			const filtered = this.data.filter((option) => this.matchesBrand(option, brand));
			if(filtered.length === 0){
				this.filteredData = this.data;
			} else {
				this.filteredData = filtered;
			}
			return this.filteredData;
		},
		filterPageData(brand = null) {
			if(!brand){
				this.pageFilteredData = this.data;
				return this.data;
			}
			const filtered = this.data.filter((option) => this.matchesBrand(option, brand));
			if(filtered.length === 0){
				this.pageFilteredData = this.data;
			} else {
				this.pageFilteredData = filtered;
			}
			return this.pageFilteredData;
		},
		sortingData(brand = null) {
			if(!brand){
				this.filteredData = this.data;
				return this.data;
			}
			// Разделяем опции на приоритетные и остальные
			const priorityList = [];
			const otherList = [];
			
			this.data.map(option => {
				const isPriority = this.matchesBrand(option, brand);
				isPriority ? priorityList.push(option) : otherList.push(option);
			});
			const sorted = [...priorityList, ...otherList];
			this.filteredData = sorted;
			// Устанавливаем флаг для очистки селекта
			this.shouldResetModalSelect = true;
			Alpine.nextTick(() => {
				this.shouldResetModalSelect = false;
			});
			return sorted;
		},
	});

	// Хранилище последней просмотренной модели (для тест-драйва и др. страниц)
	const lastViewedModelStore = {
		// Нормализованный ID модели (без пробелов/спецсимволов, в нижнем регистре)
		idNormalized: null,
		// Бренд модели
		markId: null,

		setModel(model) {
			if (!model || !model.idNormalized || !model.markId) return;

			this.idNormalized = model.idNormalized;
			this.markId = model.markId;

			// Сохраняем в localStorage, чтобы использовать между страницами
			try {
				localStorage.setItem(
					'lastViewedModel',
					JSON.stringify({
						idNormalized: this.idNormalized,
						markId: this.markId,
					}),
				);
			} catch (e) {
				// eslint-disable-next-line no-console
				console.warn('Cannot persist lastViewedModel to localStorage', e);
			}
		},

		init() {
			try {
				const raw = localStorage.getItem('lastViewedModel');
				if (!raw) return;

				const parsed = JSON.parse(raw);
				if (parsed?.idNormalized && parsed?.markId) {
					this.idNormalized = parsed.idNormalized;
					this.markId = parsed.markId;
				}
			} catch (e) {
				// eslint-disable-next-line no-console
				console.warn('Cannot read lastViewedModel from localStorage', e);
			}
		},
	};

	// Инициализируем сохранённое значение при старте Alpine
	lastViewedModelStore.init();
	Alpine.store('lastViewedModel', lastViewedModelStore);
}