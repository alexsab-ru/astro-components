import Alpine from 'alpinejs';

import { declOfNums, currencyFormat } from "@/js/utils/numbers.format";

import models from "@/data/models.json";
import { useTranslit } from '@/js/utils/translit';

document.addEventListener('alpine:init', () => {
	Alpine.data("usedPreviewGallery", t=>({
		activeIndex: 0,
		total: 0,
		init() {
			if(this.$refs.wrapper){
				this.total = this.$refs.wrapper.children.length;
			}

		},
		get activeSlide() {
			return Array.from(this.$refs.wrapper.children).find(e=>e.dataset.slide == this.activeIndex)
		},
		get windowWidth() {
			return window.innerWidth || document.documentElement.clientWidth
		},
		onPrevClick() {
			this.showSlideAt(this.activeIndex === 0 ? this.total - 1 : this.activeIndex - 1)
		},
		onNextClick() {
			const e = this.activeIndex + 1;
			this.showSlideAt(e === this.total ? 0 : e)
		},
		showSlideAt(e) {
			if (e == this.activeIndex)
				return;
			const i = this.activeSlide.getBoundingClientRect();
			this.activeIndex = e;
			const r = this.activeSlide.getBoundingClientRect();
			this.$refs.wrapper.scrollTo({
				left: r.x - i.x + this.$refs.wrapper.scrollLeft,
				behavior: "instant"
			})
		}
	}));
	Alpine.data('header', () => ({
		open: false,
		scrolling: false,
		showTopLine: localStorage.getItem('show-top-line') || 1,
		hideTopLine() {
			localStorage.setItem('show-top-line', 0);
			this.showTopLine = 0;
		},
		init() {
			this.$nextTick(() => {
				const $siteHeader = this.$root;
				let hideHeaderPos = $siteHeader.querySelector('header').offsetHeight;
				let prevScrollpos = window.scrollY;

				if (document.body.getBoundingClientRect().top != 0) {
					this.scrolling = true;
					$siteHeader.style.top = -hideHeaderPos + 'px';
				}

				window.addEventListener('resize', () => {
					this.open = false;
					hideHeaderPos = $siteHeader.querySelector('header').clientHeight;
				});

				document.addEventListener('scroll', (e) => {
					if (document.body.getBoundingClientRect().top != 0) {
						this.scrolling = true;
					} else {
						this.scrolling = false;
					}
					this.open = false;

					// Показ/скрытие шапки при скролинге
					let currentScrollPos = window.scrollY;
					if (currentScrollPos > hideHeaderPos) {
						if (prevScrollpos > currentScrollPos) {
							$siteHeader.style.top = 0;
						} else {
							$siteHeader.style.top = -hideHeaderPos + 'px';
						}
						prevScrollpos = currentScrollPos;
					} else {
						$siteHeader.style.top = 0;
					}
				});
			});
		},
	}));
	Alpine.data('scrollTop', (t) => ({
		scrolled: !1,
		init() {
			(this.scrolled =
				document.documentElement.scrollTop > window.innerHeight / 1),
				document.addEventListener('scroll', (e) => this.onScroll(e));
		},
		onScroll(e) {
			this.scrolled = document.documentElement.scrollTop > window.innerHeight / 1;
		},
		onClick() {
			document.documentElement.scroll({
				top: 0,
				behavior: 'smooth',
			});
		},
	}));
	Alpine.data('footer', (t) => ({
		showDisclaimer: true,
		onClick(e) {
			this.showDisclaimer = !this.showDisclaimer;
			this.$nextTick(() => {
				window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
			});
		}
	}));
	Alpine.data("sorting", () => ({
		open: false,
		carItems: document.querySelectorAll(".car-item"),
		carListWrapper: document.querySelector(".car-list"), // wrapper
		cars: [],
		options: [
			{ id: "price_up", title: "По возрастанию цены" },
			{ id: "price_down", title: "По убыванию цены" },
		],
		current: "price_up",
		selectedBrands: [], 
		selectedModels: [], // массив выбранных моделей
		selectedColors: [],
		selectedComplectations: [],
		selectedEngines: [],
		selectedDrives: [],
		selectedYears: [],
		value: "",
		total: 0,
		declOfNums,
		firstLoadPage: true,
  
		setTitle() {
			this.options.find((c) => {
				if (c.id === this.current) {
					this.value = c.title;
				}
			});
		},
  
		sortBy(id) {
			this.current = id;
			this.setTitle();
			this.open = false;

			if (id !== "default") {
				this.cars.sort((a, b) => {
					const priceA = parseFloat(a.getAttribute("data-price"));
					const priceB = parseFloat(b.getAttribute("data-price"));

					if (id === "price_up") {
							return priceA - priceB; // увеличение
					} else if (id === "price_down") {
							return priceB - priceA; // уменьшение
					}
				});
			} else {
				this.cars = Array.from(this.carItems);
			}

			while (this.carListWrapper.firstChild) {
				this.carListWrapper.removeChild(this.carListWrapper.firstChild);
			}

			this.cars.forEach((element) => {
				this.carListWrapper.appendChild(element);
			});

			if (!this.firstLoadPage) {
				this.addQueryParam("sort_by", id);
			}
		},
  
		addQueryParam(key, value) {
			const url = new URL(window.location.href);
			url.searchParams.set(key, value);
			window.history.pushState({ path: url.href }, "", url.href);
		},
		deleteQueryParam(key) {
			const url = new URL(window.location.href);
			url.searchParams.delete(key);
			window.history.pushState({ path: url.href }, "", url.href);
		},  
		filteredCars() {
			this.total = 0;
			const vm = this;

			this.cars.forEach((element) => {
				const carBrand = element.dataset.brand.toLowerCase();
				const carModel = element.dataset.model.toLowerCase();
				const carColor = element.dataset.color?.toLowerCase();
				const carComplectation = element.dataset.complectation?.toLowerCase();
				const carEngine = element.dataset.engine?.toLowerCase();
				const carDrive = element.dataset.drive?.toLowerCase();
				const carYear = element.dataset.year;

				const isVisible = (
					(this.selectedBrands.length === 0 || this.selectedBrands.includes(carBrand)) &&
					(this.selectedModels.length === 0 || this.selectedModels.includes(carModel)) &&
					(this.selectedColors.length === 0 || this.selectedColors.includes(carColor)) &&
					(this.selectedComplectations.length === 0 || this.selectedComplectations.includes(carComplectation)) &&
					(this.selectedEngines.length === 0 || this.selectedEngines.includes(carEngine)) &&
					(this.selectedDrives.length === 0 || this.selectedDrives.includes(carDrive)) &&
					(this.selectedYears.length === 0 || this.selectedYears.includes(carYear))
				);

				element.style.display = isVisible ? "flex" : "none";

				if (isVisible) {
					vm.total += Number(element.dataset.total);
				}
			});
			
			this.selectedBrands.length ? this.addQueryParam("brand", this.selectedBrands.join(",")) : this.deleteQueryParam('brand');
			this.selectedModels.length ? this.addQueryParam("model", this.selectedModels.join(",")) : this.deleteQueryParam('model');
			this.selectedColors.length ? this.addQueryParam("color", this.selectedColors.join(",")) : this.deleteQueryParam('color');
			this.selectedComplectations.length ? this.addQueryParam("complectation", this.selectedComplectations.join(",")) : this.deleteQueryParam('complectation');
			this.selectedEngines.length ? this.addQueryParam("engine", this.selectedEngines.join(",")) : this.deleteQueryParam('engine');
			this.selectedDrives.length ? this.addQueryParam("drive", this.selectedDrives.join(",")) : this.deleteQueryParam('drive');
			this.selectedYears.length ? this.addQueryParam("year", this.selectedYears.join(",")) : this.deleteQueryParam('year');
		},
  
		toggleFilter(type, value) {
			const targetArray = this[`selected${type}`];
			const index = targetArray.indexOf(value);

			if (index > -1) {
				targetArray.splice(index, 1);
			} else {
				targetArray.push(value);
			}

			this.filteredCars();
		},
  
		init() {
			const vm = this;
			this.cars = Array.from(this.carItems);
			this.setTitle();

			const params = new URLSearchParams(document.location.search);
			const brandParams = params.get("brand");
			const modelParams = params.get("model");
			const colorParams = params.get("color");
			const complectationParams = params.get("complectation");
			const engineParams = params.get("engine");
			const driveParams = params.get("drive");
			const yearParams = params.get("year");
			const sort_by = params.get("sort_by");

			if (sort_by) {
				this.sortBy(sort_by);
			} else {
				this.sortBy(this.current);
			}

			if (brandParams) {
				this.selectedBrands = brandParams.split(",").map((b) => b.toLowerCase());
				this.selectedBrands.forEach((brand) => {
					const checkbox = document.querySelector(`input[type='checkbox'][value='${brand}']`);
					if (checkbox) checkbox.checked = true;
				});
			}

			if (modelParams) {
				this.selectedModels = modelParams.split(",").map((m) => m.toLowerCase());
				this.selectedModels.forEach((model) => {
					const checkbox = document.querySelector(`input[type='checkbox'][value='${model}']`);
					if (checkbox) checkbox.checked = true;
				});
			}

			if (colorParams) {
				this.selectedColors = colorParams.split(",").map((c) => c.toLowerCase());
				this.selectedColors.forEach((color) => {
					const checkbox = document.querySelector(`input[type='checkbox'][value='${color}']`);
					if (checkbox) checkbox.checked = true;
				});
			}

			if (complectationParams) {
				this.selectedComplectations = complectationParams.split(",").map((c) => c.toLowerCase());
				this.selectedComplectations.forEach((complectation) => {
					const checkbox = document.querySelector(`input[type='checkbox'][value='${complectation}']`);
					if (checkbox) checkbox.checked = true;
				});
			}

			if (engineParams) {
				this.selectedEngines = engineParams.split(",").map((e) => e.toLowerCase());
				this.selectedEngines.forEach((engine) => {
					const checkbox = document.querySelector(`input[type='checkbox'][value='${engine}']`);
					if (checkbox) checkbox.checked = true;
				});
			}

			if (driveParams) {
				this.selectedDrives = driveParams.split(",").map((d) => d.toLowerCase());
				this.selectedDrives.forEach((drive) => {
					const checkbox = document.querySelector(`input[type='checkbox'][value='${drive}']`);
					if (checkbox) checkbox.checked = true;
				});
			}

			if (yearParams) {
				this.selectedYears = yearParams.split(",").map((d) => d);
				this.selectedYears.forEach((year) => {
					const checkbox = document.querySelector(`input[type='checkbox'][value='${year}']`);
					if (checkbox) checkbox.checked = true;
				});
			}

			this.filteredCars();

			this.firstLoadPage = false;
		},
	}));
	
	Alpine.data('complectation', (t) => ({
		currentModel: {},
		currentModelComplectation: {},
		selectedModel(id){
			if(this.currentModel.id === id) return;
			this.currentModel = models.find(model => model.id === id);
			this.currentModelComplectation = this.currentModel.complectations[0];
		},
		selectedModelComplectation(name){
			if(this.currentModelComplectation.name === name) return;
			this.currentModelComplectation = this.currentModel.complectations.find(c => c.name === name );
		},
		translit: useTranslit,
		currencyFormat: currencyFormat
	}));
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
			// 'Бежевый',
			// 'Бордовый',
			// 'Желтый',
			// 'Золотой',
			// 'Оранжевый',
			// 'Пурпурный',
			// 'Розовый',
			// 'Фиолетовый'
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
				setTimeout(()=>{
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
});

// window.Alpine = Alpine;
// Alpine.start();
