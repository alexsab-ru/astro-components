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
		filterData(brand = null) {
			if(!brand){
				this.filteredData = this.data;
				return this.data;
			}  
			const filtered = this.data.filter((option, index) => option?.brands && option.brands.toLowerCase().includes(brand.toLowerCase()) || option.name.toLowerCase().includes(brand.toLowerCase()));
			this.filteredData = filtered;
			return filtered;
		},
		filterPageData(brand = null) {
			if(!brand){
				this.pageFilteredData = this.data;
				return this.data;
			}
			const filtered = this.data.filter((option, index) => option?.brands && option.brands.toLowerCase().includes(brand.toLowerCase()) || option.name.toLowerCase().includes(brand.toLowerCase()));
			this.pageFilteredData = filtered;
			return filtered;
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
				const isPriority = option?.brands && option.brands.toLowerCase().includes(brand.toLowerCase()) || option.name.toLowerCase().includes(brand.toLowerCase());
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
}