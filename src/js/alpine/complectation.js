// complectation.js
import Alpine from 'alpinejs';
import models from '@/data/models.json';
import { useTranslit } from '@/js/utils/translit';
import { currencyFormat } from '@/js/utils/numbers.format';

export function complectation() {
	Alpine.data('complectation', () => ({
		currentModel: {},
		currentModelComplectation: {},
		selectedModel(id) {
			if (this.currentModel.id === id) return;
			this.currentModel = models.find(model => model.id === id);
			this.currentModelComplectation = this.currentModel.complectations[0];
		},
		selectedModelComplectation(name) {
			if (this.currentModelComplectation.name === name) return;
			this.currentModelComplectation = this.currentModel.complectations.find(c => c.name === name);
		},
		translit: useTranslit,
		currencyFormat: currencyFormat
	}));
}