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
		data: salons ? salons.map((salon, idx) => ({id: idx, ...salon})) : [],
		filteredData: salons ? salons.map((salon, idx) => ({id: idx, ...salon})) : [],
		filterData(id = null) {
			if(!id){
				this.filteredData = this.data; 
				return;
			}  
			this.filteredData = this.data.filter((salon, index) => salon.id === id);
		}
	});

}