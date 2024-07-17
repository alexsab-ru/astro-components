import Alpine from 'alpinejs';

import { declOfNums } from "@/js/utils/numbers.format";

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
		carListWrapper: document.querySelector(".car-list"), //wrapper
		cars: [],
		options: [
			// { id: "default", title: "По умолчанию" },
			{ id: "price_up", title: "По возрастанию цены" },
			{ id: "price_down", title: "По убыванию цены" },
			// { id: "asc", title: "По моделям" },
		],
		current: "price_up",
		currentModel: "all",
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
			if(id != 'default'){
				this.cars.sort(function (a, b) {
					var priceA = parseFloat(a.getAttribute("data-price"));
					var priceB = parseFloat(b.getAttribute("data-price"));
					var modelA = a.getAttribute('data-model').toLowerCase();
					var modelB = b.getAttribute('data-model').toLowerCase();
					if(id === "price_up"){
						return priceA - priceB; //увелечение
					}else if(id == "price_down"){
						return priceB - priceA; //уменьшение
					}else if(id === 'asc'){
						if (modelA < modelB) {
							return -1;
						}
					}
				})
			}else{
				this.cars = Array.from(this.carItems);
			}
			while (this.carListWrapper.firstChild) {
				this.carListWrapper.removeChild(this.carListWrapper.firstChild);
			}
			this.cars.forEach(function (element) {
				document.querySelector(".car-list").appendChild(element);
			});
			if(!this.firstLoadPage){
				this.addQueryParam('sort_by', id);
			}
		},
		addQueryParam(key, value) {
			const url = new URL(window.location.href);
			url.searchParams.set(key, value);
			window.history.pushState({path:url.href}, '', url.href);
		},
		filteredCars(model){
			this.total = 0;
			const vm = this;
			this.currentModel = model;
			this.cars.forEach(function (element) {
				element.style.display = 'none';
				if(model){
					if(element.dataset.model.toLowerCase() == model){
						element.style.display = 'block';
						vm.total = vm.total+Number(element.dataset.total)
					}else if(!model || model == 'all'){
						element.style.display = 'block';
						vm.total = vm.total+Number(element.dataset.total)
					}
				}
			});
			this.addQueryParam('model', model);
		},
		init() {
			const vm = this;
			this.cars = Array.from(this.carItems);
			this.setTitle();
			const params = new URLSearchParams(document.location.search);
			const modelParams = params.get('model');
			const sort_by = params.get('sort_by');
			if(sort_by){
				this.sortBy(sort_by)
			}else{
				this.sortBy(this.current)
			}
			if(modelParams){
				this.filteredCars(modelParams);
			}else{
				this.cars.reduce((acc, val) => {
					return vm.total = acc+Number(val.dataset.total);
				}, 0)
			}
			this.firstLoadPage = false
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
		translit: useTranslit
	}));
});

// window.Alpine = Alpine;
// Alpine.start();
