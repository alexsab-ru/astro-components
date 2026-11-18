const windowWithModelCarsCards = window;
if (!windowWithModelCarsCards.modelCarsCardsLightboxOfferBound) {
	windowWithModelCarsCards.modelCarsCardsLightboxOfferBound = true;
	document.addEventListener('click', (event) => {
		const trigger =
			event.target instanceof Element
				? event.target.closest('[data-model-lightbox-offer-trigger]')
				: null;
		if (!trigger) return;

		event.preventDefault();
		const modelId = trigger.dataset.modelLightboxOfferTrigger;
		const offerLink = modelId
			? document.querySelector(
					`[data-model-lightbox-offer="${CSS.escape(modelId)}"]`
				)
			: null;
		document.querySelector('.gclose')?.click();
		if (offerLink) window.setTimeout(() => offerLink.click(), 250);
	});
}
