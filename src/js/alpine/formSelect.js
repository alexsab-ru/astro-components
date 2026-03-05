// formSelect.js
import Alpine from 'alpinejs';

export function formSelect() {
	Alpine.data('formSelectComponent', (config = {}) => ({
		open: false,
		options: Array.isArray(config.options) ? config.options : [],
		placeholder: config.placeholder || 'Выберите значение',
		disabled: Boolean(config.disabled),
		pageData: Boolean(config.pageData),
		modalData: Boolean(config.modalData),
		value: null,
		currentOption: {},
		getCurrentOptionCalltouchValue(field) {
			// Поддерживаем два формата опции:
			// 1) Плоский: ctModId / ctRouteKey (из ChoosingDealerSelect)
			// 2) Вложенный: scripts.calltouch.mod_id / routeKey (из $store.salonsStore)
			if (!this.currentOption) return '';
			if (field === 'mod_id') {
				return this.currentOption.ctModId || (this.currentOption.scripts && this.currentOption.scripts.calltouch ? this.currentOption.scripts.calltouch.mod_id : '') || '';
			}
			if (field === 'site_id') {
				return this.currentOption.ctSiteId || (this.currentOption.scripts && this.currentOption.scripts.calltouch ? this.currentOption.scripts.calltouch.site_id : '') || '';
			}
			if (field === 'routeKey') {
				return this.currentOption.ctRouteKey || (this.currentOption.scripts && this.currentOption.scripts.calltouch ? this.currentOption.scripts.calltouch.routeKey : '') || '';
			}
			return '';
		},
		setCalltouchData() {
			// Значения храним прямо в data-атрибутах скрытого input.
			// Это простой способ отдать routeKey/mod_id в submitForm без доп. полей формы.
			if (!this.$refs.selectInput) return;
			const currentModId = this.getCurrentOptionCalltouchValue('mod_id');
			const currentSiteId = this.getCurrentOptionCalltouchValue('site_id');
			const currentRouteKey = this.getCurrentOptionCalltouchValue('routeKey');
			this.$refs.selectInput.dataset.ctModId = currentModId;
			this.$refs.selectInput.dataset.ctSiteId = currentSiteId;
			this.$refs.selectInput.dataset.ctRouteKey = currentRouteKey;
		},
		openSelect() {
			if (!this.disabled) {
				this.open = !this.open;
			}
		},
		select(id) {
			this.currentOption = this.options.find((o) => o.id === id) || {};
			this.value = this.currentOption.name || null;
			this.setCalltouchData();
			this.open = false;
			this.$refs.error ? this.$refs.error.classList.add('hidden') : null;
		},
		selectOneOption(id) {
			this.select(id);
			this.disabled = true;
		},
		resetSelect() {
			this.value = null;
			this.currentOption = {};
			// При сбросе селекта обязательно очищаем data-атрибуты,
			// чтобы submitForm не взял routeKey/mod_id от прошлого выбора.
			this.setCalltouchData();
			this.disabled = false;
		},
		effect() {
			if (this.modalData) {
				this.options = this.$store.salonsStore.filteredData;
				if (this.$store.salonsStore.shouldResetModalSelect) {
					this.resetSelect();
				} else if (this.$store.salonsStore.filteredData.length === 1) {
					this.selectOneOption(this.$store.salonsStore.filteredData[0].id);
				} else if (this.$store.salonsStore.filteredData.length > 1 && this.disabled) {
					this.resetSelect();
					this.disabled = false;
				}
				return;
			}

			if (this.pageData) {
				this.options = this.$store.salonsStore.pageFilteredData;
				if (this.$store.salonsStore.pageFilteredData.length === 1) {
					this.resetSelect();
					this.selectOneOption(this.$store.salonsStore.pageFilteredData[0].id);
				} else if (this.$store.salonsStore.pageFilteredData.length > 1 && this.disabled) {
					this.resetSelect();
					this.disabled = false;
				}
				return;
			}

			if (this.options.length === 1 && !this.value) {
				this.select(this.options[0].id);
			}
		},
	}));
}
