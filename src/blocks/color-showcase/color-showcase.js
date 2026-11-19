document.querySelectorAll('[data-color-showcase]').forEach((root) => {
	let request = 0;
	root.querySelectorAll('[data-choice-image]').forEach((button) => {
		button.addEventListener('click', () => {
			const current = ++request;
			const image = new Image();
			image.onload = () => {
				if (current !== request) return;
				root.querySelector('[data-color-image]').src =
					button.dataset.choiceImage;
				const currentImage = root.querySelector('[data-color-image]');
				if (!currentImage.dataset.colorBaseAlt)
					currentImage.alt = button.dataset.choiceName;
				root.querySelector('[data-color-name]').textContent =
					button.dataset.choiceName;
				root.querySelectorAll('[data-choice-image]').forEach(
					(choice) => {
						choice.setAttribute(
							'aria-pressed',
							String(choice === button)
						);
						choice.classList.toggle('active', choice === button);
					}
				);
			};
			image.src = button.dataset.choiceImage;
		});
	});
});
