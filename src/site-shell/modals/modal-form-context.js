import { syncFormDepartments } from '../../js/utils/formDepartments.js';
import {
	syncModalFields,
	syncModalHeadings,
} from '../../js/utils/modalFields.js';

const bindings = new WeakMap();

export function initModalForms(doc = document, trackGoal = () => {}) {
	if (bindings.has(doc)) return bindings.get(doc);
	// Site-specific form data stays outside the reusable window controller.
	const beforeOpen = (event) => {
		const modal = event.target;
		const trigger = event.detail?.trigger;
		if (!trigger) return;
		const metadata = trigger.dataset;
		const grid = modal.querySelector('.modal-grid-content');
		if (grid) {
			const position =
				metadata.img_position === 'left' ? 'left' : 'right';
			grid.classList.remove('flex-col', 'flex-col-reverse');
			for (const side of ['left', 'right']) {
				const block = grid.querySelector('.' + side);
				if (!block) continue;
				block.replaceChildren();
				block.classList.add('hidden');
				if (metadata.img && side === position) {
					const image = new doc.defaultView.Image();
					image.className =
						'modal-context-image block w-full max-w-full h-auto object-contain';
					image.src = metadata.img;
					image.alt = metadata.title || 'Изображение';
					block.append(image);
					block.classList.remove('hidden');
					grid.classList.add(
						position === 'right' ? 'flex-col-reverse' : 'flex-col'
					);
				}
			}
		}
		syncModalHeadings(modal, metadata);
		syncModalFields(modal, metadata);
		syncFormDepartments(modal, metadata.choose_department);

		const brand =
			doc.documentElement.dataset.brand ||
			new URLSearchParams(doc.location.search).get('brand') ||
			metadata.filtering;
		const dealerName = metadata.dealerName;
		const store = doc.defaultView.Alpine?.store('salonsStore');
		if (store && (brand || dealerName)) {
			if (metadata.sorting || dealerName) store.sortingData(brand);
			else store.filterData(brand);
		}
		if (dealerName && doc.defaultView.Alpine) {
			doc.defaultView.Alpine.nextTick(() =>
				modal.dispatchEvent(
					new doc.defaultView.CustomEvent('select-dealer', {
						bubbles: true,
						detail: { name: dealerName },
					})
				)
			);
		}
	};

	const opened = (event) => {
		if (
			event.detail?.reason === 'trigger' &&
			event.target.querySelector('form')
		)
			trackGoal('form_open');
	};

	const beforeClose = (event) => {
		const modal = event.target;
		const form = modal.querySelector('form');
		if (form) {
			trackGoal('form_close');
			form.reset();
		}
		modal
			.querySelectorAll('.error-message')
			.forEach((message) => message.classList.add('hidden'));
	};

	doc.addEventListener('modal:beforeopen', beforeOpen);
	doc.addEventListener('modal:open', opened);
	doc.addEventListener('modal:beforeclose', beforeClose);
	const binding = {
		destroy() {
			doc.removeEventListener('modal:beforeopen', beforeOpen);
			doc.removeEventListener('modal:open', opened);
			doc.removeEventListener('modal:beforeclose', beforeClose);
			bindings.delete(doc);
		},
	};
	bindings.set(doc, binding);
	return binding;
}
