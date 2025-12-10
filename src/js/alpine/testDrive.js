import Alpine from 'alpinejs';
import modelsData from '@/data/models.json';
import { isModelVisible } from '@/js/utils/modelVisibility';
import { normalizeModelId } from '@/js/utils/normalizeModelId';

const { testDrive } = modelsData;

export function testDriveComponent() {
	Alpine.data('testDrive', () => ({
		models: null,
		current: null,

		getModels() {
			const list = Array.isArray(testDrive) ? testDrive : [];
			this.models = list.filter(isModelVisible);
		},

		getInitialModelId() {
			if (!this.models || !this.models.length) return null;

			const stored = Alpine.store('lastViewedModel');
			if (!stored || !stored.idNormalized) {
				return this.models[0].id;
			}

			const match = this.models.find(m => {
				const modelIdNormalized = normalizeModelId(m.id);
				const brandMatch =
					!stored.markId ||
					(m.mark_id && m.mark_id.toLowerCase() === stored.markId.toLowerCase());

				return modelIdNormalized === stored.idNormalized && brandMatch;
			});

			return match ? match.id : this.models[0].id;
		},

		currentModel(id) {
			this.current = this.models.find(m => m.id === id);

			if (!this.current) {
				document.documentElement.removeAttribute('data-brand');
				this.$dispatch('brand-updated', { brand: null });
				return;
			}

			// Сохраняем выбор пользователя в Alpine store (и localStorage)
			const stored = Alpine.store('lastViewedModel');
			if (stored && typeof stored.setModel === 'function') {
				stored.setModel({
					idNormalized: normalizeModelId(this.current.id),
					markId: this.current.mark_id,
				});
			}

			const brandValue = this.current?.mark_id;
			if (brandValue) {
				document.documentElement.setAttribute('data-brand', brandValue);
				this.$dispatch('brand-updated', { brand: brandValue });
			} else {
				document.documentElement.removeAttribute('data-brand');
				this.$dispatch('brand-updated', { brand: null });
			}
		},

		init() {
			this.getModels();
			if (!this.models || !this.models.length) {
				this.current = null;
				document.documentElement.removeAttribute('data-brand');
				this.$dispatch('brand-updated', { brand: null });
				return;
			}
			const initialId = this.getInitialModelId();
			if (initialId) {
				this.currentModel(initialId);
			}
		},
	}));
}
