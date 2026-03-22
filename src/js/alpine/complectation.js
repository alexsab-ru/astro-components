// complectation.js
import Alpine from 'alpinejs';
import modelsData from '@/data/models.json';
const { models } = modelsData;
import settingsData from '@/data/settings.json';
const settingsComplectations = settingsData.complectations ?? [];
import { useTranslit } from '@/js/utils/translit';
import { currencyFormat } from '@/js/utils/numbers.format';

function applyComplectationSettings(model) {
	if (!model?.complectations?.length || !settingsComplectations.length) return model;

	const modelEntry = settingsComplectations.find(entry => entry[model.id]);
	if (!modelEntry) return model;

	const modelSettingsComplectations = modelEntry[model.id];
	if (!modelSettingsComplectations?.length) return model;

	const filtered = modelSettingsComplectations
		.map(sc => {
			const base = model.complectations.find(c => c.name === sc.name);
			if (!base) return null;

			const caption = sc.caption || base.caption;

			return {
				...base,
				caption: sc.year ? `${caption} ${sc.year}` : caption,
				...(sc.price !== undefined ? { price: sc.price } : {}),
			};
		})
		.filter(Boolean);

	if (!filtered.length) return model;

	return { ...model, complectations: filtered };
}

export function complectation() {
	Alpine.data('complectation', () => ({
		currentModel: {},
		currentModelComplectation: {},
		selectedModel(id) {
			if (this.currentModel.id === id) return;
			const model = models.find(m => m.id === id);
			this.currentModel = applyComplectationSettings(model);
			this.currentModelComplectation = this.currentModel?.complectations ? this.currentModel.complectations[0] : {};
		},
		selectedModelComplectation(name) {
			if (this.currentModelComplectation.name === name) return;
			this.currentModelComplectation = this.currentModel.complectations.find(c => c.name === name);
		},
		translit: useTranslit,
		currencyFormat: currencyFormat
	}));
}