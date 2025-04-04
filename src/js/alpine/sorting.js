// sorting.js
import Alpine from 'alpinejs';
import { declOfNums } from '@/js/utils/numbers.format';

export function sorting() {
	Alpine.data("sorting", () => ({
		open: false,
		carItems: document.querySelectorAll(".car-item"),
		carListWrapper: document.querySelector(".car-list"),
		cars: [],
		options: [
			{ id: "price_up", title: "По возрастанию цены" },
			{ id: "price_down", title: "По убыванию цены" },
			{ id: "discount_min", title: "По минимальной выгоде" },
			{ id: "discount_max", title: "По максимальной выгоде" },
			{ id: "year_up", title: "По году: старше" },
			{ id: "year_down", title: "По году: новее" },
			{ id: "name", title: "По названию" },
		],
		current: "price_up",
		selectedBrands: [],
		selectedModels: [],
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
			this.options.find(c => {
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
					const discountA = parseFloat(a.getAttribute("data-max-discount"));
					const discountB = parseFloat(b.getAttribute("data-max-discount"));
					const yearA = parseFloat(a.getAttribute("data-year"));
					const yearB = parseFloat(b.getAttribute("data-year"));
					const nameA = `${a.getAttribute("data-brand")}${a.getAttribute("data-model")}${a.getAttribute("data-complectation")}`;
					const nameB = `${b.getAttribute("data-brand")}${b.getAttribute("data-model")}${b.getAttribute("data-complectation")}`;
					switch(id) {
						case "price_up":
							return priceA - priceB;
						case "price_down":
							return priceB - priceA
						case "discount_min":
							return discountA - discountB;
						case "discount_max":
							return discountB - discountA;
						case "year_up":
							return yearA - yearB;
						case "year_down":
							return yearB - yearA;
						case "name":
							return nameA.localeCompare(nameB);
					}
				});
			} else {
				this.cars = Array.from(this.carItems);
			}

			while (this.carListWrapper.firstChild) {
				this.carListWrapper.removeChild(this.carListWrapper.firstChild);
			}
			this.cars.forEach(element => {
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
			this.cars.forEach(element => {
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
			this.updateFilterVisibility();
			this.filteredCars();
		},

		updateFilterVisibility() {
			const filters = ["brand", "model", "year"];
			const selectedValues = {
				brand: this.selectedBrands || [],
				model: this.selectedModels || [],
				year: this.selectedYears || []
			};
			filters.forEach((filter, index) => {
				const elements = document.querySelectorAll(`[data-filter-type=${filter}]`);
				if (!elements.length) return;
				const parentFilters = filters.slice(0, index);
				const parentSelectedValues = parentFilters.map(f => selectedValues[f] || []);
				elements.forEach(el => {
					if (parentFilters.length === 0 || parentSelectedValues.every(arr => arr.length === 0)) {
						el.style.display = 'block';
						return;
					}
					const isVisible = parentFilters.some((parentFilter, i) => {
						const parentValue = el.dataset[`filter${parentFilter.charAt(0).toUpperCase() + parentFilter.slice(1)}`];
						if (!parentValue) return true;
						let parentValues = parentValue.split(";").map(v => v.trim().toLowerCase().replace(',', ''));
						if (filter === "year" && selectedValues.model.length > 0) {
							parentValues = el.dataset.filterModel.split(";").map(v => v.trim().toLowerCase().replace(',', ''));
						}
						return parentValues.some(v => parentSelectedValues[i].includes(v));
					});
					el.style.display = isVisible ? 'block' : 'none';
				});
			});
		},

		init() {
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
				this.selectedBrands = brandParams.split(",").map(b => b.toLowerCase());
				this.selectedBrands.forEach(brand => {
					const checkbox = document.querySelector(`input[type='checkbox'][value='${brand}']`);
					if (checkbox) checkbox.checked = true;
				});
			}

			if (modelParams) {
				this.selectedModels = modelParams.split(",").map(m => m.toLowerCase());
				this.selectedModels.forEach(model => {
					const checkbox = document.querySelector(`input[type='checkbox'][value='${model}']`);
					if (checkbox) checkbox.checked = true;
				});
			}

			if (colorParams) {
				this.selectedColors = colorParams.split(",").map(c => c.toLowerCase());
				this.selectedColors.forEach(color => {
					const checkbox = document.querySelector(`input[type='checkbox'][value='${color}']`);
					if (checkbox) checkbox.checked = true;
				});
			}

			if (complectationParams) {
				this.selectedComplectations = complectationParams.split(",").map(c => c.toLowerCase());
				this.selectedComplectations.forEach(complectation => {
					const checkbox = document.querySelector(`input[type='checkbox'][value='${complectation}']`);
					if (checkbox) checkbox.checked = true;
				});
			}

			if (engineParams) {
				this.selectedEngines = engineParams.split(",").map(e => e.toLowerCase());
				this.selectedEngines.forEach(engine => {
					const checkbox = document.querySelector(`input[type='checkbox'][value='${engine}']`);
					if (checkbox) checkbox.checked = true;
				});
			}

			if (driveParams) {
				this.selectedDrives = driveParams.split(",").map(d => d.toLowerCase());
				this.selectedDrives.forEach(drive => {
					const checkbox = document.querySelector(`input[type='checkbox'][value='${drive}']`);
					if (checkbox) checkbox.checked = true;
				});
			}

			if (yearParams) {
				this.selectedYears = yearParams.split(",").map(d => d);
				this.selectedYears.forEach(year => {
					const checkbox = document.querySelector(`input[type='checkbox'][value='${year}']`);
					if (checkbox) checkbox.checked = true;
				});
			}

			this.updateFilterVisibility();
			this.filteredCars();
			this.firstLoadPage = false;
		},
	}));
}